export class Backup implements IModule {
  getModule() {
    return {
      state: {
        dropboxEncrypted: localStorage.dropboxEncrypted,
        driveEncrypted: localStorage.driveEncrypted,
        dropboxToken: localStorage.dropboxToken || '', // change to bool?
        driveToken: localStorage.driveToken || '', // change to bool?
      },
      namespaced: true,
    };
  }
}
