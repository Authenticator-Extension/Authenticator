import { UserSettings } from "../models/settings";

export class Backup implements Module {
  async getModule() {
    await UserSettings.updateItems();

    return {
      state: {
        // default to encrypted when unset, matching backup.ts upload behaviour
        // (an unset preference uploads encrypted, so the UI must reflect that)
        dropboxEncrypted: UserSettings.items.dropboxEncrypted !== false,
        driveEncrypted: UserSettings.items.driveEncrypted !== false,
        oneDriveEncrypted: UserSettings.items.oneDriveEncrypted !== false,
        dropboxToken: Boolean(UserSettings.items.dropboxToken),
        driveToken: Boolean(UserSettings.items.driveToken),
        oneDriveToken: Boolean(UserSettings.items.oneDriveToken),
      },
      mutations: {
        setToken(
          state: BackupState,
          args: { service: string; value: boolean },
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
