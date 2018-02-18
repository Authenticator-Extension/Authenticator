/* tslint:disable:no-reference */
/// <reference path="../models/encryption.ts" />
/// <reference path="../models/interface.ts" />
/// <reference path="./storage.ts" />

class Dropbox {
  async getToken(code?: string) {
    if (localStorage.dropboxToken) {
      return localStorage.dropboxToken;
    }

    if (!code) {
      return '';
    }

    const url = 'https://api.dropboxapi.com/oauth2/token';
    return new Promise(
        (resolve: (value: string) => void, reject: (reason: Error) => void) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.setRequestHeader(
                'Content-type', 'application/x-www-form-urlencoded');
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                const res: {[key: string]: string} =
                    JSON.parse(xhr.responseText);
                localStorage.dropboxToken = res.access_token;
                return resolve(res.access_token);
              }
              return;
            };
            xhr.send(
                `client_id=013qun2m82h9jim&client_secret=pk5tt1jrxuwq240&grant_type=authorization_code&code=${
                    code}`);
          } catch (error) {
            return reject(error);
          }
        });
  }

  async upload(encryption: Encryption) {
    const exportData = await EntryStorage.getExport(encryption);
    for (const hash of Object.keys(exportData)) {
      if (exportData[hash].encrypted) {
        throw new Error('Error passphrass.');
      }
    }
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
              path: `/Authenticator Backup/${now}.json`,
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
