export class Backup implements IModule {
  getModule() {
    return {
      state: {
        dropboxEncrypted: localStorage.dropboxEncrypted === "true",
        driveEncrypted: localStorage.driveEncrypted === "true",
        oneDriveEncrypted: localStorage.oneDriveEncrypted === "true",
        dropboxToken: Boolean(localStorage.dropboxToken),
        driveToken: Boolean(localStorage.driveToken),
        oneDriveToken: Boolean(localStorage.oneDriveToken)
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
              state.driveToken = args.value;
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
        }
      },
      namespaced: true
    };
  }
}
