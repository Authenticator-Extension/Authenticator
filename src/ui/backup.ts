/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function backup(_ui: UI) {
  const ui: UIConfig = {
    data: {
      dropboxEncrypted: localStorage.dropboxEncrypted,
      driveEncrypted: localStorage.driveEncrypted,
      dropboxToken: localStorage.dropboxToken || '',
      driveToken: localStorage.driveToken || ''
    },
    methods: {
      backupUpload: async (service: string) => {
        if (service === 'dropbox') {
          const dbox = new Dropbox();
          const response = await dbox.upload(_ui.instance.encryption);
          if (response === true) {
            _ui.instance.alert(_ui.instance.i18n.updateSuccess);
          } else {
            _ui.instance.alert(_ui.instance.i18n.updateFailure);
          }
        } else if (service === 'drive') {
          const drive = new Drive();
          const response = await drive.upload(_ui.instance.encryption);
          if (response === true) {
            _ui.instance.alert(_ui.instance.i18n.updateSuccess);
          } else {
            _ui.instance.alert(_ui.instance.i18n.updateFailure);
          }
        }
      },
      backupUpdateEncryption: (service: string) => {
        if (service === 'dropbox') {
          localStorage.dropboxEncrypted = _ui.instance.dropboxEncrypted;
        } else if (service === 'drive') {
          localStorage.driveEncrypted = _ui.instance.driveEncrypted;
        }
      },
      backupLogout: async (service: string) => {
        if (service === 'dropbox') {
          _ui.instance.dropboxToken = '';
          await new Promise((resolve: (value: boolean) => void) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://api.dropboxapi.com/2/auth/token/revoke');
            xhr.setRequestHeader(
                'Authorization', 'Bearer ' + localStorage.dropboxToken);
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                chrome.identity.removeCachedAuthToken(
                    {token: localStorage.dropboxToken}, () => {
                      resolve(true);
                    });
                return;
              }
            };
            xhr.send();
          });
        } else if (service === 'drive') {
          _ui.instance.driveToken = '';
          await new Promise((resolve: (value: boolean) => void) => {
            const xhr = new XMLHttpRequest();
            xhr.open(
                'POST',
                'https://accounts.google.com/o/oauth2/revoke?token=' +
                    localStorage.driveToken);
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                chrome.identity.removeCachedAuthToken(
                    {token: localStorage.driveToken}, () => {
                      resolve(true);
                    });
                return;
              }
            };
            xhr.send();
          });
        }
        localStorage.removeItem(service + 'Token');
        setTimeout(_ui.instance.closeInfo, 500);
      },
      getBackupToken: (service: string) => {
        chrome.runtime.sendMessage({action: service});
      },
    }
  };

  _ui.update(ui);
}
