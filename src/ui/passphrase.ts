/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function passphrase(_ui: UI) {
  const ui: UIConfig = {
    data: {passphrase: ''},
    methods: {
      applyPassphrase: async () => {
        _ui.instance.encryption.updateEncryptionPassword(
            _ui.instance.passphrase);
        await _ui.instance.updateEntries();
        _ui.instance.closeInfo();
        document.cookie = 'passphrase=' + _ui.instance.passphrase;
        return;
      },
      changePassphrase: async () => {
        if (_ui.instance.newPassphrase.phrase !==
            _ui.instance.newPassphrase.confirm) {
          _ui.instance.message = _ui.instance.i18n.phrase_not_match;
          return;
        }
        _ui.instance.encryption.updateEncryptionPassword(
            _ui.instance.newPassphrase.phrase);
        document.cookie = 'passphrase=' + _ui.instance.newPassphrase.phrase;
        await _ui.instance.importEntries();
        // remove cached passphrase in old version
        localStorage.removeItem('encodedPhrase');
        return;
      }
    }
  };

  _ui.update(ui);
}
