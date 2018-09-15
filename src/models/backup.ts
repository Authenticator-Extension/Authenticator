/* tslint:disable:no-reference */
/// <reference path="../models/encryption.ts" />
/// <reference path="../models/interface.ts" />
/// <reference path="./storage.ts" />

class Dropbox {
  private async getToken() {
    return localStorage.dropboxToken || '';
  }

  async upload(encryption: Encryption) {
    if (localStorage.dropboxEncrypted === undefined) {
      // Encrypt by default if user hasn't set yet
      localStorage.dropboxEncrypted = 'true';
    }
    const exportData = await EntryStorage.getExport(
        encryption, (localStorage.dropboxEncrypted === 'true'));
    const backup = JSON.stringify(exportData, null, 2);

    const url = 'https://content.dropboxapi.com/2/files/upload';
    const token = await this.getToken();
    return new Promise(
        (resolve: (value: boolean) => void,
         reject: (reason: Error) => void) => {
          if (!token) {
            resolve(false);
          }
          try {
            const xhr = new XMLHttpRequest();
            const now =
                (new Date()).toISOString().slice(0, 10).replace(/-/g, '');
            const apiArg = {
              path: `/${now}.json`,
              mode: 'add',
              autorename: true
            };
            xhr.open('POST', url);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Content-type', 'application/octet-stream');
            xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify(apiArg));
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 401) {
                  localStorage.removeItem('dropboxToken');
                  resolve(false);
                }
                try {
                  const res = JSON.parse(xhr.responseText);
                  if (res.name) {
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                } catch (error) {
                  reject(error);
                }
              }
              return;
            };
            xhr.send(backup);
          } catch (error) {
            return reject(error);
          }
        });
  }
}

class Drive {
  private async getToken() {
    if (!localStorage.driveToken ||
        await new Promise(
            (resolve: (value: boolean) => void,
             reject: (reason: Error) => void) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', 'https://www.googleapis.com/drive/v3/files');
              xhr.setRequestHeader(
                  'Authorization', 'Bearer ' + localStorage.driveToken);
              xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                  try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.error) {
                      if (res.error.code === 401) {
                        localStorage.driveToken = '';
                        resolve(true);
                      }
                    } else {
                      resolve(false);
                    }
                  } catch (error) {
                    console.error(error);
                    reject(error);
                  }
                }
                return;
              };
              xhr.send();
            })) {
      await this.refreshToken();
    }
    return localStorage.driveToken;
  }

  async refreshToken() {
    return new Promise(
        (resolve: (value: boolean) => void,
         reject: (reason: Error) => void) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
              'POST',
              'https://www.googleapis.com/oauth2/v4/token?client_id=292457304165-ria4acohb2i875o1kmda5a31vkan7rj7.apps.googleusercontent.com&client_secret=0AQA9EDq-WHkPLX4mfcIZ4ws&refresh_token=' +
                  localStorage.driveRefreshToken + '&grant_type=refresh_token');
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 401) {
                localStorage.removeItem('driveRefreshToken');
                resolve(false);
              }
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.error) {
                  console.error(res.error_description);
                  resolve(false);
                } else {
                  localStorage.driveToken = res.access_token;
                  resolve(true);
                }
              } catch (error) {
                console.error(error);
                reject(error);
              }
            }
            return;
          };
          xhr.send();
        });
  }

  private async getFolder() {
    const token = await this.getToken();
    if (localStorage.driveFolder) {
      await new Promise(
          (resolve: (value: boolean) => void,
           reject: (reason: Error) => void) => {
            const xhr = new XMLHttpRequest();
            xhr.open(
                'GET',
                'https://www.googleapis.com/drive/v3/files/' +
                    localStorage.driveFolder + '?fields=trashed');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 401) {
                  localStorage.removeItem('driveToken');
                  resolve(false);
                }
                try {
                  const res = JSON.parse(xhr.responseText);
                  if (res.error) {
                    if (res.error.code === 404) {
                      localStorage.driveFolder = '';
                      resolve(true);
                    }
                  } else if (res.trashed) {
                    localStorage.driveFolder = '';
                    resolve(true);
                  } else if (res.error) {
                    console.error(res.error.message);
                    resolve(false);
                  } else {
                    resolve(true);
                  }
                } catch (error) {
                  console.error(error);
                  reject(error);
                }
              }
              return;
            };
            xhr.send();
          });
    }
    if (!localStorage.driveFolder) {
      await new Promise(
          (resolve: (value: boolean) => void,
           reject: (reason: Error) => void) => {
            // create folder
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://www.googleapis.com/drive/v3/files/');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 401) {
                  localStorage.removeItem('driveToken');
                  resolve(false);
                }
                try {
                  const res = JSON.parse(xhr.responseText);
                  if (!res.error) {
                    localStorage.driveFolder = res.id;
                    resolve(true);
                  } else {
                    console.error(res.error.message);
                    resolve(false);
                  }
                } catch (error) {
                  console.error(error);
                  reject(error);
                }
              }
              return;
            };
            xhr.send(JSON.stringify({
              'name': 'Authenticator Backups',
              'mimeType': 'application/vnd.google-apps.folder'
            }));
          });
    }
    return localStorage.driveFolder;
  }

  async upload(encryption: Encryption) {
    if (localStorage.driveEncrypted === undefined) {
      localStorage.driveEncrypted = 'true';
    }
    const exportData = await EntryStorage.getExport(
        encryption, (localStorage.driveEncrypted === 'true'));
    const backup = JSON.stringify(exportData, null, 2);

    const token = await this.getToken();
    const folderId = await this.getFolder();
    return new Promise(
        (resolve: (value: boolean) => void,
         reject: (reason: Error) => void) => {
          if (!token || !folderId) {
            resolve(false);
          }
          try {
            const xhr = new XMLHttpRequest();
            const now =
                (new Date()).toISOString().slice(0, 10).replace(/-/g, '');
            xhr.open(
                'POST',
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader(
                'Content-type', 'multipart/related; boundary=segment_marker');
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status === 401) {
                  localStorage.removeItem('driveToken');
                  resolve(false);
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
                  reject(error);
                }
              }
              return;
            };
            const requestDataPrototype = [
              '--segment_marker',
              'Content-Type: application/json; charset=UTF-8', '',
              JSON.stringify(
                  {name: `${now}.json`, parents: [localStorage.driveFolder]}),
              '', '--segment_marker', 'Content-Type: application/octet-stream',
              '', backup, '--segment_marker--'
            ];
            let requestData = '';
            requestDataPrototype.forEach((line) => {
              requestData = requestData + line + '\n';
            });
            xhr.send(requestData);
          } catch (error) {
            return reject(error);
          }
        });
  }
}