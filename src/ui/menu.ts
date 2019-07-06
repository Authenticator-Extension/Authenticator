import { ManagedStorage } from '../models/storage';

export async function syncTimeWithGoogle() {
  return new Promise(
    (resolve: (value: string) => void, reject: (reason: Error) => void) => {
      try {
        // tslint:disable-next-line:ban-ts-ignore
        // @ts-ignore
        const xhr = new XMLHttpRequest({ mozAnon: true });
        xhr.open('HEAD', 'https://www.google.com/generate_204');
        const xhrAbort = setTimeout(() => {
          xhr.abort();
          return resolve('updateFailure');
        }, 5000);
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            clearTimeout(xhrAbort);
            const date = xhr.getResponseHeader('date');
            if (!date) {
              return resolve('updateFailure');
            }
            const serverTime = new Date(date).getTime();
            const clientTime = new Date().getTime();
            const offset = Math.round((serverTime - clientTime) / 1000);

            if (Math.abs(offset) <= 300) {
              // within 5 minutes
              localStorage.offset = Math.round(
                (serverTime - clientTime) / 1000
              );
              return resolve('updateSuccess');
            } else {
              return resolve('clock_too_far_off');
            }
          }
        };
        xhr.send();
      } catch (error) {
        return reject(error);
      }
    }
  );
}

export async function menu() {
  const ui = {
    data: {},
    // methods: {
    //   createWindow: (url: string) => {
    //     chrome.windows.create({ type: 'normal', url });
    //     return;
    //   },
    //   isChrome: () => {
    //     if (navigator.userAgent.indexOf('Chrome') !== -1) {
    //       return true;
    //     } else {
    //       return false;
    //     }
    //   },
    //   syncClock: async () => {
    //       chrome.permissions.request(
    //         { origins: ['https://www.google.com/'] },
    //         async granted => {
    //           if (granted) {
    //             const message = await syncTimeWithGoogle();
    //             _ui.instance.alert(_ui.instance.i18n[message]);
    //           }
    //           return;
    //         }
    //       );
    //     return;
    //   },
    //   migrateStorage: async () => {
    //     // sync => local
    //     if (
    //       localStorage.storageLocation === 'sync' &&
    //       _ui.instance.newStorageLocation === 'local'
    //     ) {
    //       return new Promise((resolve, reject) => {
    //         chrome.storage.sync.get(syncData => {
    //           chrome.storage.local.set(syncData, () => {
    //             chrome.storage.local.get(localData => {
    //               // Double check if data was set
    //               if (
    //                 Object.keys(syncData).every(
    //                   value => Object.keys(localData).indexOf(value) >= 0
    //                 )
    //               ) {
    //                 localStorage.storageLocation = 'local';
    //                 chrome.storage.sync.clear();
    //                 _ui.instance.alert(_ui.instance.i18n.updateSuccess);
    //                 resolve();
    //                 return;
    //               } else {
    //                 _ui.instance.alert(
    //                   _ui.instance.i18n.updateFailure +
    //                     ' All data not transferred successfully.'
    //                 );
    //                 reject('Transfer failure');
    //                 return;
    //               }
    //             });
    //           });
    //         });
    //       });
    //       // local => sync
    //     } else if (
    //       localStorage.storageLocation === 'local' &&
    //       _ui.instance.newStorageLocation === 'sync'
    //     ) {
    //       return new Promise((resolve, reject) => {
    //         chrome.storage.local.get(localData => {
    //           chrome.storage.sync.set(localData, () => {
    //             chrome.storage.sync.get(syncData => {
    //               // Double check if data was set
    //               if (
    //                 Object.keys(localData).every(
    //                   value => Object.keys(syncData).indexOf(value) >= 0
    //                 )
    //               ) {
    //                 localStorage.storageLocation = 'sync';
    //                 chrome.storage.local.clear();
    //                 _ui.instance.alert(_ui.instance.i18n.updateSuccess);
    //                 resolve();
    //                 return;
    //               } else {
    //                 _ui.instance.alert(
    //                   _ui.instance.i18n.updateFailure +
    //                     ' All data not transferred successfully.'
    //                 );
    //                 reject('Transfer failure');
    //                 return;
    //               }
    //             });
    //           });
    //         });
    //       });
    //     } else {
    //       return;
    //     }
    //   },
    // },
  };
}
