export class Backup implements Module {
  async getModule() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    return {
      state: {
        dropboxEncrypted:
          LocalStorage.dropboxEncrypted === "true" ||
          LocalStorage.dropboxEncrypted === true,
        driveEncrypted:
          LocalStorage.driveEncrypted === "true" ||
          LocalStorage.driveEncrypted === true,
        oneDriveEncrypted:
          LocalStorage.oneDriveEncrypted === "true" ||
          LocalStorage.oneDriveEncrypted === true,
        dropboxToken: Boolean(LocalStorage.dropboxToken),
        driveToken: Boolean(LocalStorage.driveToken),
        oneDriveToken: Boolean(LocalStorage.oneDriveToken),
      },
      mutations: {
        setToken(
          state: BackupState,
          args: { service: string; value: boolean }
        ) {
          switch (args.service) {
            case "dropbox":
              state.dropboxToken = args.value;
              break;

            case "drive":
              state.driveToken = args.value;
              break;

            case "onedrive":
              state.oneDriveToken = args.value;
              break;

            default:
              break;
          }
        },
        setEnc(state: BackupState, args: { service: string; value: boolean }) {
          switch (args.service) {
            case "dropbox":
              state.dropboxEncrypted = args.value;
              break;

            case "drive":
              state.driveEncrypted = args.value;
              break;

            case "onedrive":
              state.oneDriveEncrypted = args.value;
              break;

            default:
              break;
          }
        },
      },
      namespaced: true,
    };
  }
}
