import { OTPEntry } from '../models/otp';

export async function addAccount() {
  const ui = {
    data: {},
    // methods: {
    //   addNewAccount: async () => {
    //   },
    //   beginCapture: async () => {
    //     await insertContentScript();

    //     const entries = _ui.instance.entries as OTPEntry[];
    //     for (let i = 0; i < entries.length; i++) {
    //       // we have encrypted entry
    //       // the current passphrase is incorrect
    //       // shouldn't add new account with
    //       // the current passphrase
    //       if (entries[i].code === 'Encrypted') {
    //         _ui.instance.alert(_ui.instance.i18n.phrase_incorrect);
    //         return;
    //       }
    //     }

    //     chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    //       const tab = tabs[0];
    //       if (!tab || !tab.id) {
    //         return;
    //       }
    //       chrome.tabs.sendMessage(tab.id, { action: 'capture' }, result => {
    //         if (result !== 'beginCapture') {
    //           _ui.instance.alert(_ui.instance.i18n.capture_failed);
    //         } else {
    //           window.close();
    //         }
    //       });
    //     });
    //     return;
    //   },
    //   addAccountManually: () => {
    //     const entries = _ui.instance.entries as OTPEntry[];
    //     for (let i = 0; i < entries.length; i++) {
    //       // we have encrypted entry
    //       // the current passphrase is incorrect
    //       // shouldn't add new account with
    //       // the current passphrase
    //       if (entries[i].code === 'Encrypted') {
    //         _ui.instance.alert(_ui.instance.i18n.phrase_incorrect);
    //         return;
    //       }
    //     }

    //     _ui.instance.newAccount.show = true;
    //   },
    // },
  };
}
