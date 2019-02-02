/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function insertContentScript() {
  return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
    try {
      return chrome.tabs.executeScript({file: '/build/content.js'}, () => {
        chrome.tabs.insertCSS({file: '/css/content.css'}, resolve);
      });
    } catch (error) {
      return reject(error);
    }
  });
}

async function addAccount(_ui: UI) {
  const ui: UIConfig = {
    data: {
      newAccount: {show: false, account: '', secret: '', type: OTPType.totp},
      newPassphrase: {phrase: '', confirm: ''}
    },
    methods: {
      addNewAccount: async () => {
        _ui.instance.newAccount.secret =
            _ui.instance.newAccount.secret.replace(/ /g, '');

        if (!/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
            !/^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret)) {
          _ui.instance.alert(
              _ui.instance.i18n.errorsecret + _ui.instance.newAccount.secret);
          return;
        }

        let type: OTPType;
        if (!/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
            /^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret) &&
            _ui.instance.newAccount.type === 'totp') {
          type = OTPType.hex;
        } else if (
            !/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
            /^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret) &&
            _ui.instance.newAccount.type === 'hotp') {
          type = OTPType.hhex;
        } else {
          type = _ui.instance.newAccount.type;
        }

        const entry = new OTPEntry(
            type, '', _ui.instance.newAccount.secret,
            _ui.instance.newAccount.account, 0, 0);
        await entry.create(_ui.instance.encryption);
        await _ui.instance.updateEntries();
        _ui.instance.newAccount.type = OTPType.totp;
        _ui.instance.account = '';
        _ui.instance.secret = '';
        _ui.instance.newAccount.show = false;
        _ui.instance.closeInfo();
        _ui.instance.class.edit = false;

        const codes = document.getElementById('codes');
        if (codes) {
          // wait vue apply changes to dom
          setTimeout(() => {
            codes.scrollTop = 0;
          }, 0);
        }
        return;
      },
      beginCapture: async () => {
        await insertContentScript();

        const entries = _ui.instance.entries as OTPEntry[];
        for (let i = 0; i < entries.length; i++) {
          // we have encrypted entry
          // the current passphrase is incorrect
          // shouldn't add new account with
          // the current passphrase
          if (entries[i].code === 'Encrypted') {
            _ui.instance.alert(_ui.instance.i18n.phrase_incorrect);
            return;
          }
        }

        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
          const tab = tabs[0];
          if (!tab || !tab.id) {
            return;
          }
          chrome.tabs.sendMessage(tab.id, {action: 'capture'}, (result) => {
            if (result !== 'beginCapture') {
              _ui.instance.alert(_ui.instance.i18n.capture_failed);
            } else {
              window.close();
            }
          });
        });
        return;
      },
      addAccountManually: () => {
        const entries = _ui.instance.entries as OTPEntry[];
        for (let i = 0; i < entries.length; i++) {
          // we have encrypted entry
          // the current passphrase is incorrect
          // shouldn't add new account with
          // the current passphrase
          if (entries[i].code === 'Encrypted') {
            _ui.instance.alert(_ui.instance.i18n.phrase_incorrect);
            return;
          }
        }

        _ui.instance.newAccount.show = true;
      }
    }
  };

  _ui.update(ui);
}
