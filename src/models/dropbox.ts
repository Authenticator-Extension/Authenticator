/* tslint:disable:no-reference */
/// <reference path="../models/encryption.ts" />
/// <reference path="../models/interface.ts" />
/// <reference path="./storage.ts" />

class Dropbox {
  async getToken() {
    return localStorage.dropboxToken || '';
  }

  async upload(encryption: Encryption) {
    const exportData = await EntryStorage.getExport(encryption);
    for (const hash of Object.keys(exportData)) {
      if (exportData[hash].encrypted) {
        throw new Error('Error passphrase.');
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
