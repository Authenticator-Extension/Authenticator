import { UserSettings } from "../models/settings";

export class Backup implements Module {
  async getModule() {
    UserSettings.updateItems();

    return {
      state: {
        dropboxEncrypted: UserSettings.items.dropboxEncrypted === true,
        driveEncrypted: UserSettings.items.driveEncrypted === true,
        oneDriveEncrypted: UserSettings.items.oneDriveEncrypted === true,
        dropboxToken: Boolean(UserSettings.items.dropboxToken),
        driveToken: Boolean(UserSettings.items.driveToken),
        oneDriveToken: Boolean(UserSettings.items.oneDriveToken),
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
