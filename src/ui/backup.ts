import { Drive, Dropbox } from '../models/backup';

export async function backup() {
  const ui = {
    data: {},
    // methods: {
    //   runScheduledBackup: (clientTime: number) => {
    //     if (_ui.instance.dropboxToken) {
    //       chrome.permissions.contains(
    //         { origins: ['https://*.dropboxapi.com/*'] },
    //         async hasPermission => {
    //           if (hasPermission) {
    //             try {
    //               const dropbox = new Dropbox();
    //               const res = await dropbox.upload(_ui.instance.encryption);
    //               if (res) {
    //                 // we have uploaded backup to Dropbox
    //                 // no need to remind
    //                 localStorage.lastRemindingBackupTime = clientTime;
    //                 return;
    //               } else if (localStorage.dropboxRevoked === 'true') {
    //                 _ui.instance.alert(
    //                   chrome.i18n.getMessage('token_revoked', ['Dropbox'])
    //                 );
    //                 localStorage.removeItem('dropboxRevoked');
    //               }
    //             } catch (error) {
    //               // ignore
    //             }
    //           }
    //           _ui.instance.alert(_ui.instance.i18n.remind_backup);
    //           localStorage.lastRemindingBackupTime = clientTime;
    //         }
    //       );
    //     }
    //     if (_ui.instance.driveToken) {
    //       chrome.permissions.contains(
    //         {
    //           origins: [
    //             'https://www.googleapis.com/*',
    //             'https://accounts.google.com/o/oauth2/revoke',
    //           ],
    //         },
    //         async hasPermission => {
    //           if (hasPermission) {
    //             try {
    //               const drive = new Drive();
    //               const res = await drive.upload(_ui.instance.encryption);
    //               if (res) {
    //                 localStorage.lastRemindingBackupTime = clientTime;
    //                 return;
    //               } else if (localStorage.driveRevoked === 'true') {
    //                 _ui.instance.alert(
    //                   chrome.i18n.getMessage('token_revoked', ['Google Drive'])
    //                 );
    //                 localStorage.removeItem('driveRevoked');
    //               }
    //             } catch (error) {
    //               // ignore
    //             }
    //           }
    //           _ui.instance.alert(_ui.instance.i18n.remind_backup);
    //           localStorage.lastRemindingBackupTime = clientTime;
    //         }
    //       );
    //     }
    //     if (!_ui.instance.driveToken && !_ui.instance.dropboxToken) {
    //       _ui.instance.alert(_ui.instance.i18n.remind_backup);
    //       localStorage.lastRemindingBackupTime = clientTime;
    //     }
    //   },
    // },
  };
}
