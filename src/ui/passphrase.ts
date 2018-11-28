/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

function cachePassword(password: string) {
  document.cookie = 'passphrase=' + password;
  chrome.runtime.sendMessage({action: 'cachePassphrase', value: password});
}

async function passphrase(_ui: UI) {
  const ui: UIConfig = {
    data: {passphrase: ''},
    methods: {
      lock: () => {
        document.cookie = 'passphrase=";expires=Thu, 01 Jan 1970 00:00:00 GMT"';
        chrome.runtime.sendMessage({action: 'lock'}, window.close);
        return;
      },
      removePassphrase: async () => {
        _ui.instance.newPassphrase.phrase = '';
        _ui.instance.newPassphrase.confirm = '';
        await _ui.instance.changePassphrase();
        return;
      },
      applyPassphrase: async () => {
        if (!_ui.instance.passphrase) {
          return;
        }
        _ui.instance.encryption.updateEncryptionPassword(
            _ui.instance.passphrase);
        await _ui.instance.updateEntries();
        const siteName = await getSiteName();
        _ui.instance.shouldFilter =
            hasMatchedEntry(siteName, _ui.instance.entries);
        _ui.instance.closeInfo();
        cachePassword(_ui.instance.passphrase);
        return;
      },
      changePassphrase: async () => {
        if (_ui.instance.newPassphrase.phrase !==
            _ui.instance.newPassphrase.confirm) {
          _ui.instance.alert(_ui.instance.i18n.phrase_not_match);
          return;
        }
        _ui.instance.encryption.updateEncryptionPassword(
            _ui.instance.newPassphrase.phrase);
        cachePassword(_ui.instance.newPassphrase.phrase);
        await _ui.instance.importEntries();
        // remove cached passphrase in old version
        localStorage.removeItem('encodedPhrase');
        return;
      }
    }
  };

  _ui.update(ui);
}
