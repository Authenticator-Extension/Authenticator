import * as CryptoJS from 'crypto-js';

import { Encryption } from '../models/encryption';
import { OTPEntry, OTPType } from '../models/otp';
import { EntryStorage } from '../models/storage';

/* tslint:disable-next-line:no-any */
async function updateCode(app: any) {
  return;
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
//       updateStorage: async () => {
//         await EntryStorage.set(_ui.instance.encryption, _ui.instance.entries);
//         return;
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
//   };
// }
