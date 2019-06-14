export class Backup implements IModule {
  getModule() {
    return {
      state: {
        dropboxEncrypted: localStorage.dropboxEncrypted,
        driveEncrypted: localStorage.driveEncrypted,
        dropboxToken: localStorage.dropboxToken || '',
        driveToken: localStorage.driveToken || '',
      },
      namespaced: true
    };
  }
}
