/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function info(_ui: UI) {
  const ui: UIConfig = {
    data: {info: '', dropboxToken: localStorage.dropboxToken || ''},
    methods: {
      getDropboxToken: async () => {
        return new Promise((resolve: () => void) => {
          chrome.identity.launchWebAuthFlow(
              {
                url:
                    'https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=013qun2m82h9jim&redirect_uri=' +
                    encodeURIComponent(chrome.identity.getRedirectURL()),
                interactive: true
              },
              (url) => {
                if (!url) {
                  return;
                }
                const hashMatches = url.split('#');
                if (hashMatches.length < 2) {
                  return;
                }

                const hash = hashMatches[1];

                const resData = hash.split('&');
                for (let i = 0; i < resData.length; i++) {
                  const kv = resData[i];
                  console.log(kv, /^(.*?)=(.*?)$/.test(kv));
                  if (/^(.*?)=(.*?)$/.test(kv)) {
                    const kvMatches = kv.match(/^(.*?)=(.*?)$/);
                    if (!kvMatches) {
                      continue;
                    }
                    const key = kvMatches[1];
                    const value = kvMatches[2];
                    console.log(key, value);
                    if (key === 'access_token') {
                      localStorage.dropboxToken = value;
                      _ui.instance.dropboxToken = value;
                      setTimeout(_ui.instance.closeInfo, 500);
                      break;
                    }
                  }
                }
                return resolve();
              });
        });
      },
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
