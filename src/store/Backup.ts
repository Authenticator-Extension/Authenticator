import { UserSettings } from "../models/settings";

export class Backup implements Module {
  async getModule() {
    UserSettings.updateItems();

    return {
      state: {
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
      },
      namespaced: true,
    };
  }
}
