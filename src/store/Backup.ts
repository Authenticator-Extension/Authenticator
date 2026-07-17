import { defineStore } from "pinia";
import { ref } from "vue";
import { UserSettings } from "../models/settings";

export const useBackupStore = defineStore("backup", () => {
  // default to encrypted when unset, matching backup.ts upload behaviour
  // (an unset preference uploads encrypted, so the UI must reflect that)
  const dropboxEncrypted = ref(true);
  const driveEncrypted = ref(true);
  const oneDriveEncrypted = ref(true);
  const dropboxToken = ref(false);
  const driveToken = ref(false);
  const oneDriveToken = ref(false);

  // Populates state from UserSettings; the caller must await this before the
  // popup mounts so components never observe the pre-init defaults above.
  async function init() {
    await UserSettings.updateItems();

    dropboxEncrypted.value = UserSettings.items.dropboxEncrypted !== false;
    driveEncrypted.value = UserSettings.items.driveEncrypted !== false;
    oneDriveEncrypted.value = UserSettings.items.oneDriveEncrypted !== false;
    dropboxToken.value = Boolean(UserSettings.items.dropboxToken);
    driveToken.value = Boolean(UserSettings.items.driveToken);
    oneDriveToken.value = Boolean(UserSettings.items.oneDriveToken);
  }

  function setToken(args: { service: string; value: boolean }) {
    switch (args.service) {
      case "dropbox":
        dropboxToken.value = args.value;
        break;

      case "drive":
        driveToken.value = args.value;
        break;

      case "onedrive":
        oneDriveToken.value = args.value;
        break;

      default:
        break;
    }
  }

  function setEnc(args: { service: string; value: boolean }) {
    switch (args.service) {
      case "dropbox":
        dropboxEncrypted.value = args.value;
        break;

      case "drive":
        driveEncrypted.value = args.value;
        break;

      case "onedrive":
        oneDriveEncrypted.value = args.value;
        break;

      default:
        break;
    }
  }

  return {
    dropboxEncrypted,
    driveEncrypted,
    oneDriveEncrypted,
    dropboxToken,
    driveToken,
    oneDriveToken,
    init,
    setToken,
    setEnc,
  };
});
