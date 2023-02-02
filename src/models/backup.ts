import { getCredentials } from "./credentials";
import { Encryption } from "./encryption";
import { EntryStorage } from "./storage";

export class Dropbox implements BackupProvider {
  private async getToken() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    return LocalStorage.dropboxToken || "";
  }

  async upload(encryption: Encryption) {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (LocalStorage.dropboxEncrypted === undefined) {
      // Encrypt by default if user hasn't set yet
      LocalStorage.dropboxEncrypted = true;
      await chrome.storage.local.set({ LocalStorage });
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      LocalStorage.dropboxEncrypted === "true" ||
        LocalStorage.dropboxEncrypted === true
    );
    const backup = JSON.stringify(exportData, null, 2);

    const url = "https://content.dropboxapi.com/2/files/upload";
    const token = await this.getToken();
    return new Promise(
      (resolve: (value: boolean) => void, reject: (reason: Error) => void) => {
        if (!token) {
          return resolve(false);
        }
        try {
          const xhr = new XMLHttpRequest();
          const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const apiArg = {
            path: `/${now}.json`,
            mode: "add",
            autorename: true,
          };
          xhr.open("POST", url);
          xhr.setRequestHeader("Authorization", "Bearer " + token);
          xhr.setRequestHeader("Content-type", "application/octet-stream");
          xhr.setRequestHeader("Dropbox-API-Arg", JSON.stringify(apiArg));
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                LocalStorage.dropboxToken = undefined;
                LocalStorage.dropboxRevoked = true;
                chrome.storage.local.set({ LocalStorage });
                return resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.name) {
                  resolve(true);
                } else {
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
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
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
            LocalStorage.dropboxToken = undefined;
            LocalStorage.dropboxRevoked = true;
            chrome.storage.local.set({ LocalStorage });
            resolve(
              "Error: Response was 401. You will be logged out the next time you open Authenticator."
            );
          }
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.email) {
              resolve(res.email);
            } else {
              console.error("Could not find email in reponse.", res);
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
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (
      !LocalStorage.driveToken ||
      (await new Promise(
        (
          resolve: (value: boolean) => void,
          reject: (reason: Error) => void
        ) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "https://www.googleapis.com/drive/v3/files");
          xhr.setRequestHeader(
            "Authorization",
            "Bearer " + LocalStorage.driveToken
          );
          xhr.onreadystatechange = async () => {
            if (xhr.readyState === 4) {
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  if (res.error.code === 401) {
                    if (
                      navigator.userAgent.indexOf("Chrome") !== -1 &&
                      navigator.userAgent.indexOf("OPR") === -1 &&
                      navigator.userAgent.indexOf("Edg") === -1
                    ) {
                      // Clear invalid token from
                      // chrome://identity-internals/
                      await chrome.identity.removeCachedAuthToken({
                        token: LocalStorage.driveToken,
                      });
                    }
                    LocalStorage.driveToken = undefined;
                    chrome.storage.local.set({ LocalStorage });
                    resolve(true);
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
    return LocalStorage.driveToken;
  }

  private async refreshToken() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};

    if (
      navigator.userAgent.indexOf("Chrome") !== -1 &&
      navigator.userAgent.indexOf("OPR") === -1 &&
      navigator.userAgent.indexOf("Edg") === -1
    ) {
      return new Promise((resolve: (value: boolean) => void) => {
        return chrome.identity.getAuthToken(
          {
            interactive: false,
            scopes: ["https://www.googleapis.com/auth/drive.file"],
          },
          (token) => {
            LocalStorage.driveToken = token;
            if (!token) {
              LocalStorage.driveRevoked = true;
            }
            chrome.storage.local.set({ LocalStorage });
            resolve(Boolean(token));
          }
        );
      });
    } else {
      return new Promise(
        (
          resolve: (value: boolean) => void,
          reject: (reason: Error) => void
        ) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            "https://www.googleapis.com/oauth2/v4/token?client_id=" +
              getCredentials().drive.client_id +
              "&client_secret=" +
              getCredentials().drive.client_secret +
              "&refresh_token=" +
              LocalStorage.driveRefreshToken +
              "&grant_type=refresh_token"
          );
          xhr.setRequestHeader("Accept", "application/json");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                LocalStorage.driveRefreshToken = undefined;
                LocalStorage.driveRevoked = true;
                chrome.storage.local.set({ LocalStorage });
                return resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  if (res.error === "invalid_grant") {
                    LocalStorage.driveRefreshToken = undefined;
                    LocalStorage.driveRevoked = true;
                    chrome.storage.local.set({ LocalStorage });
                  }
                  console.error(res.error_description);
                  resolve(false);
                } else {
                  LocalStorage.driveToken = res.access_token;
                  chrome.storage.local.set({ LocalStorage });
                  resolve(true);
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
      );
    }
  }

  private async getFolder() {
    const token = await this.getToken();
    if (!token) {
      return false;
    }
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (LocalStorage.driveFolder) {
      await new Promise(
        (
          resolve: (value: boolean) => void,
          reject: (reason: Error) => void
        ) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            "https://www.googleapis.com/drive/v3/files/" +
              LocalStorage.driveFolder +
              "?fields=trashed"
          );
          xhr.setRequestHeader("Authorization", "Bearer " + token);
          xhr.setRequestHeader("Accept", "application/json");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                LocalStorage.driveToken = undefined;
                chrome.storage.local.set({ LocalStorage });
                return resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  if (res.error.code === 404) {
                    LocalStorage.driveFolder = undefined;
                    chrome.storage.local.set({ LocalStorage });
                    resolve(true);
                  }
                } else if (res.trashed) {
                  LocalStorage.driveFolder = undefined;
                  chrome.storage.local.set({ LocalStorage });
                  resolve(true);
                } else if (res.error) {
                  console.error(res.error.message);
                  resolve(false);
                } else {
                  resolve(true);
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
      );
    }
    if (!LocalStorage.driveFolder) {
      await new Promise(
        (
          resolve: (value: boolean) => void,
          reject: (reason: Error) => void
        ) => {
          // create folder
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://www.googleapis.com/drive/v3/files/");
          xhr.setRequestHeader("Authorization", "Bearer " + token);
          xhr.setRequestHeader("Accept", "application/json");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                LocalStorage.driveToken = undefined;
                chrome.storage.local.set({ LocalStorage });
                return resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (!res.error) {
                  LocalStorage.driveFolder = res.id;
                  chrome.storage.local.set({ LocalStorage });
                  resolve(true);
                } else {
                  console.error(res.error.message);
                  resolve(false);
                }
              } catch (error) {
                console.error(error);
                reject(error as Error);
              }
            }
            return;
          };
          xhr.send(
            JSON.stringify({
              name: "Authenticator Backups",
              mimeType: "application/vnd.google-apps.folder",
            })
          );
        }
      );
    }
    return LocalStorage.driveFolder;
  }

  async upload(encryption: Encryption) {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (LocalStorage.driveEncrypted === undefined) {
      LocalStorage.driveEncrypted = true;
      chrome.storage.local.set({ LocalStorage });
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      LocalStorage.driveEncrypted === "true" ||
        LocalStorage.driveEncrypted === true
    );
    const backup = JSON.stringify(exportData, null, 2);

    const token = await this.getToken();
    if (!token) {
      return false;
    }
    const folderId = await this.getFolder();
    return new Promise(
      (resolve: (value: boolean) => void, reject: (reason: Error) => void) => {
        if (!token || !folderId) {
          return resolve(false);
        }
        try {
          const xhr = new XMLHttpRequest();
          const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          xhr.open(
            "POST",
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
          );
          xhr.setRequestHeader("Authorization", "Bearer " + token);
          xhr.setRequestHeader(
            "Content-type",
            "multipart/related; boundary=segment_marker"
          );
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                LocalStorage.driveToken = undefined;
                chrome.storage.local.set({ LocalStorage });
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
          const requestDataPrototype = [
            "--segment_marker",
            "Content-Type: application/json; charset=UTF-8",
            "",
            JSON.stringify({
              name: `${now}.json`,
              parents: [LocalStorage.driveFolder],
            }),
            "",
            "--segment_marker",
            "Content-Type: application/octet-stream",
            "",
            backup,
            "--segment_marker--",
          ];
          let requestData = "";
          requestDataPrototype.forEach((line) => {
            requestData = requestData + line + "\n";
          });
          xhr.send(requestData);
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

    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
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
            LocalStorage.driveToken = undefined;
            chrome.storage.local.set({ LocalStorage });
            resolve(
              "Error: Response was 401. You will be logged out the next time you open Authenticator."
            );
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
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (
      !LocalStorage.oneDriveToken ||
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
            "Bearer " + LocalStorage.oneDriveToken
          );
          xhr.onreadystatechange = async () => {
            if (xhr.readyState === 4) {
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  if (res.error.code === 401) {
                    LocalStorage.oneDriveToken = undefined;
                    chrome.storage.local.set({ LocalStorage });
                    resolve(true);
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
    return LocalStorage.oneDriveToken;
  }

  private async refreshToken() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
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
              LocalStorage.oneDriveRefreshToken = undefined;
              LocalStorage.oneDriveRevoked = true;
              chrome.storage.local.set({ LocalStorage });
              return resolve(false);
            }
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) {
                if (res.error === "invalid_grant") {
                  LocalStorage.oneDriveRefreshToken = undefined;
                  LocalStorage.oneDriveRevoked = true;
                  chrome.storage.local.set({ LocalStorage });
                }
                console.error(res.error_description);
                resolve(false);
              } else {
                LocalStorage.oneDriveToken = res.access_token;
                chrome.storage.local.set({ LocalStorage });
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
            LocalStorage.oneDriveRefreshToken
          }&client_secret=${encodeURIComponent(
            getCredentials().onedrive.client_secret
          )}&grant_type=refresh_token&scope=https%3A%2F%2Fgraph.microsoft.com%2FFiles.ReadWrite${
            LocalStorage.oneDriveBusiness !== "true" &&
            LocalStorage.oneDriveBusiness !== true
              ? ".AppFolder"
              : ""
          }%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access`
        );
      }
    );
  }

  async upload(encryption: Encryption) {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    if (LocalStorage.oneDriveEncrypted === undefined) {
      LocalStorage.oneDriveEncrypted = true;
    }
    const exportData = await EntryStorage.backupGetExport(
      encryption,
      LocalStorage.oneDriveEncrypted === "true" ||
        LocalStorage.oneDriveEncrypted === true
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
                LocalStorage.removeItem("oneDriveToken");
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

    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};

    return new Promise((resolve: (value: string) => void) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://graph.microsoft.com/v1.0/me/");
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 401) {
            LocalStorage.oneDriveToken = undefined;
            chrome.storage.local.set({ LocalStorage });
            resolve(
              "Error: Response was 401. You will be logged out the next time you open Authenticator."
            );
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
