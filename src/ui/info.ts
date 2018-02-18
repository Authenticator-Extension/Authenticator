/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function info(_ui: UI) {
  const ui: UIConfig = {
    data: {
      info: '',
      dropboxCode: '',
      dropboxToken: localStorage.dropboxToken || ''
    },
    methods: {
      saveDropboxCode: async () => {
        const dropbox = new Dropbox();
        _ui.instance.dropboxToken =
            await dropbox.getToken(_ui.instance.dropboxCode);
        _ui.instance.closeInfo();
        return;
      },
      showInfo: (tab: string) => {
        if (tab === 'export' || tab === 'security') {
          const entries = _ui.instance.entries as OTPEntry[];
          for (let i = 0; i < entries.length; i++) {
            // we have encrypted entry
            // the current passphrass is incorrect
            // cannot export account data
            // or change passphrase
            if (entries[i].code === 'Encrypted') {
              _ui.instance.message = _ui.instance.i18n.phrase_incorrect;
              return;
            }
          }
        } else if (tab === 'dropbox') {
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