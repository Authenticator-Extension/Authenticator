export class Backup implements Module {
  getModule() {
    return {
      state: {
        dropboxEncrypted: localStorage.dropboxEncrypted === "true",
        driveEncrypted: localStorage.driveEncrypted === "true",
        oneDriveEncrypted: localStorage.oneDriveEncrypted === "true",
        oneDriveBusinessEncrypted:
          localStorage.oneDriveBusinessEncrypted === "true",
        dropboxToken: Boolean(localStorage.dropboxToken),
        driveToken: Boolean(localStorage.driveToken),
        oneDriveToken: Boolean(localStorage.oneDriveToken),
        oneDriveBusinessToken: Boolean(localStorage.oneDriveBusinessToken),
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

            case "onedrivebusiness":
              state.oneDriveBusinessToken = args.value;
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

            case "onedrivebusiness":
              state.oneDriveBusinessEncrypted = args.value;
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
