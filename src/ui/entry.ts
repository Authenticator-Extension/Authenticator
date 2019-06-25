import * as CryptoJS from 'crypto-js';

import { Encryption } from '../models/encryption';
import { OTPEntry, OTPType } from '../models/otp';
import { EntryStorage } from '../models/storage';

import { insertContentScript } from './add-account';

/* tslint:disable-next-line:no-any */
async function updateCode(app: any) {
  let second = new Date().getSeconds();
  if (localStorage.offset) {
    // prevent second from negative
    second += Number(localStorage.offset) + 60;
  }

  second = second % 60;
  app.second = second;

  // only when sector is not started (timer is not initialized),
  // passphrase box should not be shown (no passphrase set) or
  // there are entiries shown and passphrase box isn't shown (the user has
  // already provided password)
  if (
    !app.sectorStart &&
    (!app.shouldShowPassphrase ||
      (app.entries.length > 0 && app.info !== 'passphrase'))
  ) {
    app.sectorStart = true;
    app.sectorOffset = -second;
  }

  // if (second > 25) {
  //   app.class.timeout = true;
  // } else {
  //   app.class.timeout = false;
  // }
  // if (second < 1) {
  //   const entries = app.entries as OTP[];
  //   for (let i = 0; i < entries.length; i++) {
  //     if (entries[i].type !== OTPType.hotp &&
  //         entries[i].type !== OTPType.hhex) {
  //       entries[i].generate();
  //     }
  //   }
  // }
  const entries = app.entries as IOTPEntry[];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].type !== OTPType.hotp && entries[i].type !== OTPType.hhex) {
      entries[i].generate();
    }
  }
}

function getEntryDataFromOTPAuthPerLine(importCode: string) {
  const lines = importCode.split('\n');
  const exportData: { [hash: string]: OTPStorage } = {};
  for (let item of lines) {
    item = item.trim();
    if (!item.startsWith('otpauth:')) {
      continue;
    }

    let uri = item.split('otpauth://')[1];
    let type = uri.substr(0, 4).toLowerCase();
    uri = uri.substr(5);
    let label = uri.split('?')[0];
    const parameterPart = uri.split('?')[1];
    if (!parameterPart) {
      continue;
    } else {
      let account = '';
      let secret = '';
      let issuer = '';
      let period: number | undefined = undefined;

      try {
        label = decodeURIComponent(label);
      } catch (error) {
        console.error(error);
      }
      if (label.indexOf(':') !== -1) {
        issuer = label.split(':')[0];
        account = label.split(':')[1];
      } else {
        account = label;
      }
      const parameters = parameterPart.split('&');
      parameters.forEach(item => {
        const parameter = item.split('=');
        if (parameter[0].toLowerCase() === 'secret') {
          secret = parameter[1];
        } else if (parameter[0].toLowerCase() === 'issuer') {
          try {
            issuer = decodeURIComponent(parameter[1]);
          } catch {
            issuer = parameter[1];
          }
        } else if (parameter[0].toLowerCase() === 'counter') {
          let counter = Number(parameter[1]);
          counter = isNaN(counter) || counter < 0 ? 0 : counter;
        } else if (parameter[0].toLowerCase() === 'period') {
          period = Number(parameter[1]);
          period =
            isNaN(period) || period < 0 || period > 60 || 60 % period !== 0
              ? undefined
              : period;
        }
      });

      if (!secret) {
        continue;
      } else if (
        !/^[0-9a-f]+$/i.test(secret) &&
        !/^[2-7a-z]+=*$/i.test(secret)
      ) {
        continue;
      } else {
        const hash = CryptoJS.MD5(secret).toString();
        if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === 'totp'
        ) {
          type = 'hex';
        } else if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === 'hotp'
        ) {
          type = 'hhex';
        }

        exportData[hash] = {
          account,
          hash,
          issuer,
          secret,
          type,
          encrypted: false,
          index: 0,
          counter: 0,
        };
        if (period) {
          exportData[hash].period = period;
        }
      }
    }
  }
  return exportData;
}

// export async function entry(_ui: UI) {
//   const ui: UIConfig = {
//     methods: {
//       isMatchedEntry: (entry: OTPEntry) => {
//         return isMatchedEntry(siteName, entry);
//       },
//       searchListener: e => {
//         if (e.keyCode === 191) {
//           if (_ui.instance.info !== '') {
//             return;
//           }
//           _ui.instance.filter = false;
//           // It won't focus the texfield if vue unhides the div
//           //_ui.instance.showSearch = true;
//           const searchDiv = document.getElementById('search');
//           const searchInput = document.getElementById('searchInput');
//           if (!searchInput || !searchDiv) {
//             return;
//           }
//           searchDiv.style.display = 'block';
//           searchInput.focus();
//         }
//       },
//       searchUpdate: () => {
//         if (_ui.instance.filter) {
//           _ui.instance.filter = false;
//         }
//         if (!_ui.instance.showSearch) {
//           _ui.instance.showSearch = true;
//         }
//       },
//       isSearchedEntry: (entry: OTPEntry) => {
//         // This gets called before _ui.instance exists sometimes
//         if (!_ui.instance) {
//           return true;
//         }
//         if (_ui.instance.searchText === '') {
//           return true;
//         }

//         if (
//           entry.issuer
//             .toLowerCase()
//             .includes(_ui.instance.searchText.toLowerCase()) ||
//           entry.account
//             .toLowerCase()
//             .includes(_ui.instance.searchText.toLowerCase())
//         ) {
//           return true;
//         } else {
//           return false;
//         }
//       },
//       updateCode: async () => {
//         return updateCode(_ui.instance);
//       },
//       decryptBackupData: (
//         backupData: { [hash: string]: OTPStorage },
//         passphrase: string | null
//       ) => {
//         const decryptedbackupData: { [hash: string]: OTPStorage } = {};
//         for (const hash of Object.keys(backupData)) {
//           if (typeof backupData[hash] !== 'object') {
//             continue;
//           }
//           if (!backupData[hash].secret) {
//             continue;
//           }
//           if (backupData[hash].encrypted && !passphrase) {
//             continue;
//           }
//           if (backupData[hash].encrypted && passphrase) {
//             try {
//               backupData[hash].secret = CryptoJS.AES.decrypt(
//                 backupData[hash].secret,
//                 passphrase
//               ).toString(CryptoJS.enc.Utf8);
//               backupData[hash].encrypted = false;
//             } catch (error) {
//               continue;
//             }
//           }
//           // backupData[hash].secret may be empty after decrypt with wrong
//           // passphrase
//           if (!backupData[hash].secret) {
//             continue;
//           }
//           decryptedbackupData[hash] = backupData[hash];
//         }
//         return decryptedbackupData;
//       },
//       importBackupCode: async () => {
//         let exportData: { [hash: string]: OTPStorage } = {};
//         try {
//           exportData = JSON.parse(_ui.instance.importCode);
//         } catch (error) {
//           // Maybe one-otpauth-per line text
//           exportData = getEntryDataFromOTPAuthPerLine(_ui.instance.importCode);
//         }

//         try {
//           const passphrase: string | null =
//             _ui.instance.importEncrypted && _ui.instance.importPassphrase
//               ? _ui.instance.importPassphrase
//               : null;
//           const decryptedbackupData: {
//             [hash: string]: OTPStorage;
//           } = _ui.instance.decryptBackupData(exportData, passphrase);
//           if (Object.keys(decryptedbackupData).length) {
//             await EntryStorage.import(
//               _ui.instance.encryption,
//               decryptedbackupData
//             );
//             await _ui.instance.updateEntries();
//             alert(_ui.instance.i18n.updateSuccess);
//             window.close();
//           } else {
//             alert(_ui.instance.i18n.updateFailure);
//           }
//           return;
//         } catch (error) {
//           throw error;
//         }
//       },
//       noCopy: (code: string) => {
//         return (
//           code === 'Encrypted' ||
//           code === 'Invalid' ||
//           code.startsWith('&bull;')
//         );
//       },
//       updateStorage: async () => {
//         await EntryStorage.set(_ui.instance.encryption, _ui.instance.entries);
//         return;
//       },
//       showBulls: (code: string) => {
//         if (code.startsWith('&bull;')) {
//           return code;
//         }
//         return new Array(code.length).fill('&bull;').join('');
//       },
//       importEntries: async () => {
//         await EntryStorage.import(
//           _ui.instance.encryption,
//           JSON.parse(_ui.instance.exportData)
//         );
//         await _ui.instance.updateEntries();
//         _ui.instance.alert(_ui.instance.i18n.updateSuccess);
//         return;
//       },
//       updateEntries: async () => {
//         const exportData = await EntryStorage.getExport(
//           _ui.instance.encryption
//         );
//         const exportEncData = await EntryStorage.getExport(
//           _ui.instance.encryption,
//           true
//         );
//         _ui.instance.exportData = JSON.stringify(exportData, null, 2);
//         _ui.instance.entries = await getEntries(_ui.instance.encryption);
//         _ui.instance.exportFile = getBackupFile(exportData);
//         _ui.instance.exportEncryptedFile = getBackupFile(exportEncData);
//         _ui.instance.exportOneLineOtpAuthFile = getOneLineOtpBackupFile(
//           exportData
//         );
//         await _ui.instance.updateCode();
//         return;
//       },
//       getOldPassphrase: async () => {
//         _ui.instance.getFilePassphrase = true;
//         while (true) {
//           if (_ui.instance.readFilePassphrase) {
//             if (_ui.instance.importFilePassphrase) {
//               _ui.instance.readFilePassphrase = false;
//               break;
//             } else {
//               _ui.instance.readFilePassphrase = false;
//             }
//           }
//           await new Promise(resolve => setTimeout(resolve, 250));
//         }
//         return _ui.instance.importFilePassphrase as string;
//       },
//       importFile: (event: Event, closeWindow: boolean) => {
//         const target = event.target as HTMLInputElement;
//         if (!target || !target.files) {
//           return;
//         }
//         if (target.files[0]) {
//           const reader = new FileReader();
//           let decryptedFileData: { [hash: string]: OTPStorage } = {};
//           reader.onload = async () => {
//             let importData: { [hash: string]: OTPStorage } = {};
//             try {
//               importData = JSON.parse(reader.result as string);
//             } catch (e) {
//               importData = getEntryDataFromOTPAuthPerLine(
//                 reader.result as string
//               );
//             }

//             let encrypted = false;
//             for (const hash in importData) {
//               if (importData[hash].encrypted) {
//                 encrypted = true;
//                 try {
//                   const oldPassphrase:
//                     | string
//                     | null = await _ui.instance.getOldPassphrase();
//                   decryptedFileData = _ui.instance.decryptBackupData(
//                     importData,
//                     oldPassphrase
//                   );
//                   break;
//                 } catch {
//                   break;
//                 }
//               }
//             }
//             if (!encrypted) {
//               decryptedFileData = importData;
//             }
//             if (Object.keys(decryptedFileData).length) {
//               await EntryStorage.import(
//                 _ui.instance.encryption,
//                 decryptedFileData
//               );
//               await _ui.instance.updateEntries();
//               alert(_ui.instance.i18n.updateSuccess);
//               if (closeWindow) {
//                 window.close();
//               }
//             } else {
//               alert(_ui.instance.i18n.updateFailure);
//               _ui.instance.getFilePassphrase = false;
//               _ui.instance.importFilePassphrase = '';
//             }
//           };
//           reader.readAsText(target.files[0], 'utf8');
//         } else {
//           _ui.instance.alert(_ui.instance.i18n.updateFailure);
//           if (closeWindow) {
//             window.alert(_ui.instance.i18n.updateFailure);
//             window.close();
//           }
//         }
//         return;
//       },
//       removeEntry: async (entry: OTPEntry) => {
//         if (await _ui.instance.confirm(_ui.instance.i18n.confirm_delete)) {
//           await entry.delete();
//           await _ui.instance.updateEntries();
//         }
//         return;
//       },
//       nextCode: async (entry: OTPEntry) => {
//         if (_ui.instance.currentClass.Diabled) {
//           return;
//         }
//         _ui.instance.currentClass.hotpDiabled = true;
//         await entry.next(_ui.instance.encryption);
//         setTimeout(() => {
//           _ui.instance.currentClass.hotpDiabled = false;
//         }, 3000);
//         return;
//       },
//       copyCode: async (entry: OTPEntry) => {
//         if (
//           _ui.instance.currentClass.edit ||
//           entry.code === 'Invalid' ||
//           entry.code.startsWith('&bull;')
//         ) {
//           return;
//         }

//         if (entry.code === 'Encrypted') {
//           _ui.instance.showInfo('passphrase');
//           return;
//         }

//         if (navigator.userAgent.indexOf('Edge') !== -1) {
//           const codeClipboard = document.getElementById(
//             'codeClipboard'
//           ) as HTMLInputElement;
//           if (!codeClipboard) {
//             return;
//           }

//           if (_ui.instance.useAutofill) {
//             await insertContentScript();

//             chrome.tabs.query(
//               { active: true, lastFocusedWindow: true },
//               tabs => {
//                 const tab = tabs[0];
//                 if (!tab || !tab.id) {
//                   return;
//                 }

//                 chrome.tabs.sendMessage(tab.id, {
//                   action: 'pastecode',
//                   code: entry.code,
//                 });
//               }
//             );
//           }

//           codeClipboard.value = entry.code;
//           codeClipboard.focus();
//           codeClipboard.select();
//           document.execCommand('Copy');
//           _ui.instance.notification = _ui.instance.i18n.copied;
//           clearTimeout(_ui.instance.notificationTimeout);
//           _ui.instance.currentClass.notificationFadein = true;
//           _ui.instance.currentClass.notificationFadeout = false;
//           _ui.instance.notificationTimeout = setTimeout(() => {
//             _ui.instance.currentClass.notificationFadein = false;
//             _ui.instance.currentClass.notificationFadeout = true;
//             setTimeout(() => {
//               _ui.instance.currentClass.notificationFadeout = false;
//             }, 200);
//           }, 1000);
//         } else {
//           chrome.permissions.request(
//             { permissions: ['clipboardWrite'] },
//             async granted => {
//               if (granted) {
//                 const codeClipboard = document.getElementById(
//                   'codeClipboard'
//                 ) as HTMLInputElement;
//                 if (!codeClipboard) {
//                   return;
//                 }

//                 if (_ui.instance.useAutofill) {
//                   await insertContentScript();

//                   chrome.tabs.query(
//                     { active: true, lastFocusedWindow: true },
//                     tabs => {
//                       const tab = tabs[0];
//                       if (!tab || !tab.id) {
//                         return;
//                       }

//                       chrome.tabs.sendMessage(tab.id, {
//                         action: 'pastecode',
//                         code: entry.code,
//                       });
//                     }
//                   );
//                 }

//                 codeClipboard.value = entry.code;
//                 codeClipboard.focus();
//                 codeClipboard.select();
//                 document.execCommand('Copy');
//                 _ui.instance.notification = _ui.instance.i18n.copied;
//                 clearTimeout(_ui.instance.notificationTimeout);
//                 _ui.instance.currentClass.notificationFadein = true;
//                 _ui.instance.currentClass.notificationFadeout = false;
//                 _ui.instance.notificationTimeout = setTimeout(() => {
//                   _ui.instance.currentClass.notificationFadein = false;
//                   _ui.instance.currentClass.notificationFadeout = true;
//                   setTimeout(() => {
//                     _ui.instance.currentClass.notificationFadeout = false;
//                   }, 200);
//                 }, 1000);
//               }
//             }
//           );
//         }
//         return;
//       },
//     },
//   };
// }
