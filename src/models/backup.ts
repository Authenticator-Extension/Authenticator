import { getCredentials } from "./credentials";
import { Encryption } from "./encryption";
import { UserSettings } from "./settings";
import { EntryStorage } from "./storage";
import { cloudBackupAllowed } from "../utils";

export class Dropbox implements BackupProvider {
  private async getToken() {
    await UserSettings.updateItems();
    return UserSettings.items.dropboxToken || "";
  }

  async upload(encryption: Encryption) {
    // Never let a cloud backup carry plaintext secrets: require a master
    // password (which encrypts the export) before uploading anything.
    if (!cloudBackupAllowed(encryption)) {
      return false;
    }
    await UserSettings.updateItems();

    if (UserSettings.items.dropboxEncrypted === undefined) {
      // Encrypt by default if user hasn't set yet
      UserSettings.items.dropboxEncrypted = true;
      UserSettings.commitItems();
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      UserSettings.items.dropboxEncrypted === true
    );
    const backup = JSON.stringify(exportData, null, 2);

    const url = "https://content.dropboxapi.com/2/files/upload";
    const token = await this.getToken();
    if (!token) {
      return false;
    }
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const apiArg = {
      path: `/${now}.json`,
      mode: "add",
      autorename: true,
    };
    // fetch (not XMLHttpRequest) because upload runs in the MV3 background
    // service worker, where XHR is not defined.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify(apiArg),
      },
      body: backup,
    });
    if (res.status === 401) {
      UserSettings.items.dropboxToken = undefined;
      UserSettings.items.dropboxRevoked = true;
      UserSettings.commitItems();
      return false;
    }
    if (!res.ok) {
      // a non-2xx (5xx, HTML error page, ...) is a failed upload, not
      // something to JSON.parse and maybe misread as success. Surface
      // Dropbox's body so the actual cause (bad path / arg / scope) is visible.
      const detail = await res.text();
      throw new Error(
        "Dropbox upload failed: HTTP " + res.status + " " + detail
      );
    }
    const body = await res.json();
    return Boolean(body.name);
  }
  async getUser() {
    await UserSettings.updateItems();
    const url = "https://api.dropboxapi.com/2/users/get_current_account";
    const token = await this.getToken();
    return new Promise((resolve: (value: string) => void) => {
      if (!token) {
        return resolve("Error: No token");
      }
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 401) {
            UserSettings.items.dropboxToken = undefined;
            UserSettings.items.dropboxRevoked = true;
            UserSettings.commitItems();
            resolve(
              "Error: Response was 401. You will be logged out the next time you open OTPilot."
            );
            return;
          }
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.email) {
              resolve(res.email);
            } else {
              console.error("Could not find email in response.", res);
              resolve("Error: res.email was undefined.");
            }
          } catch (e) {
            console.error(e);
            resolve("Error");
          }
        }
        return;
      };
      xhr.send(null);
    });
  }
}

export class Drive implements BackupProvider {
  private async getToken() {
    await UserSettings.updateItems();
    let needsRefresh = !UserSettings.items.driveToken;
    if (UserSettings.items.driveToken) {
      // validate the cached access token; a 401 means it expired/was revoked.
      // fetch (not XHR) so this works in the MV3 service worker too.
      const res = await fetch("https://www.googleapis.com/drive/v3/files", {
        headers: { Authorization: "Bearer " + UserSettings.items.driveToken },
      });
      if (res.status === 401) {
        UserSettings.items.driveToken = undefined;
        UserSettings.commitItems();
        needsRefresh = true;
      }
    }
    if (needsRefresh) {
      await this.refreshToken();
    }
    return UserSettings.items.driveToken;
  }

  private async refreshToken() {
    await UserSettings.updateItems();
    if (!UserSettings.items.driveRefreshToken) {
      UserSettings.items.driveRevoked = true;
      UserSettings.commitItems();
      return;
    }
    // Refresh-token flow via fetch. getAuthToken is no longer usable (Google
    // blocks custom-URI-scheme OAuth clients for new apps) and fetch works in
    // both the popup and the MV3 service worker (XHR is undefined there).
    const res = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:
        `client_id=${getCredentials().drive.client_id}` +
        `&client_secret=${getCredentials().drive.client_secret}` +
        `&refresh_token=${UserSettings.items.driveRefreshToken}` +
        `&grant_type=refresh_token`,
    });
    if (res.status === 401) {
      UserSettings.items.driveRefreshToken = undefined;
      UserSettings.items.driveRevoked = true;
      UserSettings.commitItems();
      return;
    }
    const data = await res.json();
    if (data.error) {
      if (data.error === "invalid_grant") {
        UserSettings.items.driveRefreshToken = undefined;
        UserSettings.items.driveRevoked = true;
        UserSettings.commitItems();
      }
      console.error(data.error_description);
      return;
    }
    UserSettings.items.driveToken = data.access_token;
    UserSettings.commitItems();
  }

  private async getFolder() {
    const token = await this.getToken();
    if (!token) {
      return false;
    }
    await UserSettings.updateItems();
    if (UserSettings.items.driveFolder) {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files/" +
          UserSettings.items.driveFolder +
          "?fields=trashed",
        {
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/json",
          },
        }
      );
      if (res.status === 401) {
        UserSettings.items.driveToken = undefined;
        UserSettings.commitItems();
        return false;
      }
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 404) {
          UserSettings.items.driveFolder = undefined;
          UserSettings.commitItems();
        } else {
          console.error(data.error.message);
          return false;
        }
      } else if (data.trashed) {
        UserSettings.items.driveFolder = undefined;
        UserSettings.commitItems();
      }
    }
    if (!UserSettings.items.driveFolder) {
      const res = await fetch("https://www.googleapis.com/drive/v3/files/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Authenticator Backups",
          mimeType: "application/vnd.google-apps.folder",
        }),
      });
      if (res.status === 401) {
        UserSettings.items.driveToken = undefined;
        UserSettings.commitItems();
        return false;
      }
      const data = await res.json();
      if (!data.error) {
        UserSettings.items.driveFolder = data.id;
        UserSettings.commitItems();
      } else {
        console.error(data.error.message);
        return false;
      }
    }
    return UserSettings.items.driveFolder;
  }

  async upload(encryption: Encryption) {
    if (!cloudBackupAllowed(encryption)) {
      return false;
    }
    await UserSettings.updateItems();
    if (UserSettings.items.driveEncrypted === undefined) {
      UserSettings.items.driveEncrypted = true;
      UserSettings.commitItems();
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      UserSettings.items.driveEncrypted === true
    );
    const backup = JSON.stringify(exportData, null, 2);

    const token = await this.getToken();
    if (!token) {
      return false;
    }
    const folderId = await this.getFolder();
    if (!folderId) {
      return false;
    }
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const requestData =
      [
        "--segment_marker",
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify({ name: `${now}.json`, parents: [folderId] }),
        "",
        "--segment_marker",
        "Content-Type: application/octet-stream",
        "",
        backup,
        "--segment_marker--",
      ].join("\n") + "\n";
    // fetch (not XMLHttpRequest) because upload runs in the MV3 service worker.
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "multipart/related; boundary=segment_marker",
        },
        body: requestData,
      }
    );
    if (res.status === 401) {
      UserSettings.items.driveToken = undefined;
      UserSettings.items.driveRevoked = true;
      UserSettings.commitItems();
      return false;
    }
    if (!res.ok) {
      // a non-2xx is a failed upload, not something to JSON.parse as success
      return false;
    }
    const data = await res.json();
    if (!data.error) {
      return true;
    }
    console.error(data.error.message);
    return false;
  }

  async getUser() {
    const token = await this.getToken();
    if (!token) {
      return "Error: Access revoked or expired.";
    }

    await UserSettings.updateItems();
    return new Promise((resolve: (value: string) => void) => {
      if (!token) {
        resolve("Error: Access revoked or expired.");
      }
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://www.googleapis.com/drive/v2/about?fields=user");
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 401) {
            UserSettings.items.driveToken = undefined;
            UserSettings.commitItems();
            resolve(
              "Error: Response was 401. You will be logged out the next time you open OTPilot."
            );
            return;
          }
          try {
            const res = JSON.parse(xhr.responseText);
            if (!res.error) {
              resolve(res.user.emailAddress);
            } else {
              console.error(res.error.message);
              resolve("Error");
            }
          } catch (e) {
            console.error(e);
            resolve("Error");
          }
        }
        return;
      };
      xhr.send();
    });
  }
}

export class OneDrive implements BackupProvider {
  private async getToken() {
    await UserSettings.updateItems();
    if (
      !UserSettings.items.oneDriveToken ||
      (await new Promise(
        (
          resolve: (value: boolean) => void,
          reject: (reason: Error) => void
        ) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            "https://graph.microsoft.com/v1.0/me/drive/special/approot"
          );
          xhr.setRequestHeader(
            "Authorization",
            "Bearer " + UserSettings.items.oneDriveToken
          );
          xhr.onreadystatechange = async () => {
            if (xhr.readyState === 4) {
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  if (res.error.code === 401) {
                    UserSettings.items.oneDriveToken = undefined;
                    UserSettings.commitItems();
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                } else {
                  resolve(false);
                }
              } catch (error) {
                console.error(error);
                reject(error as Error);
              }
            }
            return;
          };
          xhr.send();
        }
      ))
    ) {
      await this.refreshToken();
    }
    return UserSettings.items.oneDriveToken;
  }

  private async refreshToken() {
    await UserSettings.updateItems();
    return new Promise(
      (resolve: (value: boolean) => void, reject: (reason: Error) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        );
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded"
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 401) {
              UserSettings.items.oneDriveRefreshToken = undefined;
              UserSettings.items.oneDriveRevoked = true;
              UserSettings.commitItems();
              return resolve(false);
            }
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) {
                if (res.error === "invalid_grant") {
                  UserSettings.items.oneDriveRefreshToken = undefined;
                  UserSettings.items.oneDriveRevoked = true;
                  UserSettings.commitItems();
                }
                console.error(res.error_description);
                resolve(false);
              } else {
                UserSettings.items.oneDriveToken = res.access_token;
                UserSettings.commitItems();
                resolve(true);
              }
            } catch (error) {
              console.error(error);
              reject(error as Error);
            }
          }
          return;
        };
        xhr.send(
          `client_id=${getCredentials().onedrive.client_id}&refresh_token=${
            UserSettings.items.oneDriveRefreshToken
          }&client_secret=${encodeURIComponent(
            getCredentials().onedrive.client_secret
          )}&grant_type=refresh_token&scope=https%3A%2F%2Fgraph.microsoft.com%2FFiles.ReadWrite${
            UserSettings.items.oneDriveBusiness !== true ? ".AppFolder" : ""
          }%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access`
        );
      }
    );
  }

  async upload(encryption: Encryption) {
    if (!cloudBackupAllowed(encryption)) {
      return false;
    }
    await UserSettings.updateItems();
    if (UserSettings.items.oneDriveEncrypted === undefined) {
      UserSettings.items.oneDriveEncrypted = true;
      UserSettings.commitItems();
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      UserSettings.items.oneDriveEncrypted === true
    );
    const backup = JSON.stringify(exportData, null, 2);

    const token = await this.getToken();
    if (!token) {
      return false;
    }

    return new Promise(
      (resolve: (value: boolean) => void, reject: (reason: Error) => void) => {
        if (!token) {
          return resolve(false);
        }
        try {
          const xhr = new XMLHttpRequest();
          const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          xhr.open(
            "PUT",
            `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${now}.json:/content`
          );
          xhr.setRequestHeader("Authorization", "Bearer " + token);
          xhr.setRequestHeader("Content-type", "application/octet-stream");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                UserSettings.items.oneDriveToken = undefined;
                UserSettings.items.oneDriveRevoked = true;
                UserSettings.commitItems();
                return resolve(false);
              }
              if (xhr.status < 200 || xhr.status >= 300) {
                // a non-2xx is a failed upload; don't fall through and risk
                // misreading the body as success
                return resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (!res.error) {
                  resolve(true);
                } else {
                  console.error(res.error.message);
                  resolve(false);
                }
              } catch (error) {
                reject(error as Error);
              }
            }
            return;
          };
          xhr.send(backup);
        } catch (error) {
          return reject(error as Error);
        }
      }
    );
  }

  async getUser() {
    const token = await this.getToken();
    if (!token) {
      return "Error: Access revoked or expired.";
    }

    await UserSettings.updateItems();

    return new Promise((resolve: (value: string) => void) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://graph.microsoft.com/v1.0/me/");
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 401) {
            UserSettings.items.oneDriveToken = undefined;
            UserSettings.commitItems();
            resolve(
              "Error: Response was 401. You will be logged out the next time you open OTPilot."
            );
            return;
          }
          try {
            const res = JSON.parse(xhr.responseText);
            if (!res.error) {
              resolve(res.userPrincipalName);
            } else {
              console.error(res.error.message);
              resolve("Error");
            }
          } catch (e) {
            console.error(e);
            resolve("Error");
          }
        }
        return;
      };
      xhr.send();
    });
  }
}
