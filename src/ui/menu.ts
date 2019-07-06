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
