/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function info(_ui: UI) {
  const ui: UIConfig = {
    data: {info: ''},
    methods: {
      showInfo: (tab: string) => {
        if (tab === 'export' || tab === 'security') {
          const entries = _ui.instance.entries as OTPEntry[];
          for (let i = 0; i < entries.length; i++) {
            // we have encrypted entry
            // the current passphrase is incorrect
            // cannot export account data
            // or change passphrase
            if (entries[i].code === 'Encrypted') {
              _ui.instance.alert(_ui.instance.i18n.phrase_incorrect);
              return;
            }
          }
        } else if (tab === 'dropbox') {
          if (localStorage.dropboxEncrypted !== 'true' &&
              localStorage.dropboxEncrypted !== 'false') {
            localStorage.dropboxEncrypted = 'true';
            _ui.instance.dropboxEncrypted = localStorage.dropboxEncrypted;
          }

          chrome.permissions.request(
              {origins: ['https://*.dropboxapi.com/*']}, async (granted) => {
                if (granted) {
                  _ui.instance.class.fadein = true;
                  _ui.instance.class.fadeout = false;
                  _ui.instance.info = tab;
                }
                return;
              });
          return;
        } else if (tab === 'drive') {
          if (localStorage.driveEncrypted !== 'true' &&
              localStorage.driveEncrypted !== 'false') {
            localStorage.driveEncrypted = 'true';
            _ui.instance.driveEncrypted = localStorage.driveEncrypted;
          }
          chrome.permissions.request(
              {
                origins: [
                  'https://www.googleapis.com/*',
                  'https://accounts.google.com/o/oauth2/revoke'
                ]
              },
              async (granted) => {
                if (granted) {
                  _ui.instance.class.fadein = true;
                  _ui.instance.class.fadeout = false;
                  _ui.instance.info = tab;
                }
                return;
              });
          return;
        } else if (tab === 'storage') {
          if (_ui.instance.newStorageLocation !== 'sync' &&
              _ui.instance.newStorageLocation !== 'local') {
            _ui.instance.newStorageLocation = localStorage.storageLocation;
          }
        }

        _ui.instance.class.fadein = true;
        _ui.instance.class.fadeout = false;
        _ui.instance.info = tab;
        return;
      },
      closeInfo: () => {
        _ui.instance.class.fadein = false;
        _ui.instance.class.fadeout = true;
        setTimeout(() => {
          _ui.instance.class.fadeout = false;
          _ui.instance.info = '';
          _ui.instance.newAccount.show = false;
        }, 200);
        return;
      }
    }
  };

  _ui.update(ui);
}
