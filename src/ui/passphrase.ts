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
      applyPassphrase: async () => {
        _ui.instance.encryption.updateEncryptionPassword(
            _ui.instance.passphrase);
        await _ui.instance.updateEntries();
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
