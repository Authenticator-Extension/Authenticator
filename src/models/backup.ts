import { getCredentials } from "./credentials";
import { Encryption } from "./encryption";
import { UserSettings } from "./settings";
import { EntryStorage } from "./storage";
import { cloudBackupAllowed } from "../utils";

export class Dropbox implements BackupProvider {
  private async refreshToken(): Promise<boolean> {
    await UserSettings.updateItems();
    if (!UserSettings.items.dropboxRefreshToken) {
      UserSettings.items.dropboxRevoked = true;
      UserSettings.commitItems();
      return false;
    }
    // PKCE-upgraded flow: refresh without client_secret
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:
        "grant_type=refresh_token" +
        "&refresh_token=" +
        encodeURIComponent(UserSettings.items.dropboxRefreshToken) +
        "&client_id=" +
        encodeURIComponent(getCredentials().dropbox.client_id),
    });
    if (res.status === 401) {
      UserSettings.items.dropboxRefreshToken = undefined;
      UserSettings.items.dropboxRevoked = true;
      UserSettings.commitItems();
      return false;
    }
    const data = await res.json();
    if (data.error) {
      if (data.error === "invalid_grant") {
        UserSettings.items.dropboxRefreshToken = undefined;
        UserSettings.items.dropboxRevoked = true;
        UserSettings.commitItems();
      }
      console.error(data.error_description);
      return false;
    }
    UserSettings.items.dropboxToken = data.access_token;
    UserSettings.commitItems();
    return true;
  }

  private async getToken(): Promise<string> {
    await UserSettings.updateItems();
    if (!UserSettings.items.dropboxToken) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return "";
      }
    }
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
      UserSettings.items.dropboxEncrypted === true,
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
      // Token expired: try refresh once, then retry
      UserSettings.items.dropboxToken = undefined;
      UserSettings.commitItems();
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return false;
      }
      const newToken = UserSettings.items.dropboxToken || "";
      if (!newToken) {
        return false;
      }
      const retryRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + newToken,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify(apiArg),
        },
        body: backup,
      });
      if (!retryRes.ok) {
        if (retryRes.status === 401) {
          UserSettings.items.dropboxToken = undefined;
          UserSettings.items.dropboxRevoked = true;
          UserSettings.commitItems();
        }
        return false;
      }
      const retryBody = await retryRes.json();
      return Boolean(retryBody.name);
    }
    if (!res.ok) {
      // a non-2xx (5xx, HTML error page, ...) is a failed upload, not
      // something to JSON.parse and maybe misread as success. Surface
      // Dropbox's body so the actual cause (bad path / arg / scope) is visible.
      const detail = await res.text();
      throw new Error(
        "Dropbox upload failed: HTTP " + res.status + " " + detail,
      );
    }
    const body = await res.json();
    return Boolean(body.name);
  }

  async getUser() {
    await UserSettings.updateItems();
    const url = "https://api.dropboxapi.com/2/users/get_current_account";
    const token = await this.getToken();
    if (!token) {
      return "Error: No token";
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: "null",
    });
    if (res.status === 401) {
      UserSettings.items.dropboxToken = undefined;
      UserSettings.items.dropboxRevoked = true;
      UserSettings.commitItems();
      return "Error: Response was 401. You will be logged out the next time you open OTPilot.";
    }
    try {
      const data = await res.json();
      if (data.email) {
        return data.email as string;
      } else {
        console.error("Could not find email in response.", data);
        return "Error: res.email was undefined.";
      }
    } catch (e) {
      console.error(e);
      return "Error";
    }
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
          reject: (reason: Error) => void,
        ) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            "https://graph.microsoft.com/v1.0/me/drive/special/approot",
          );
          xhr.setRequestHeader(
            "Authorization",
            "Bearer " + UserSettings.items.oneDriveToken,
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
        },
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
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        );
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded",
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
            getCredentials().onedrive.client_secret,
          )}&grant_type=refresh_token&scope=https%3A%2F%2Fgraph.microsoft.com%2FFiles.ReadWrite${
            UserSettings.items.oneDriveBusiness !== true ? ".AppFolder" : ""
          }%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access`,
        );
      },
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
      UserSettings.items.oneDriveEncrypted === true,
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
            `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${now}.json:/content`,
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
      },
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
              "Error: Response was 401. You will be logged out the next time you open OTPilot.",
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
