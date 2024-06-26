export enum StorageLocation {
  Sync = "sync",
  Local = "local",
}

interface UserSettingsData {
  // local settings
  driveEncrypted?: boolean;
  driveFolder?: string;
  driveRefreshToken?: string;
  driveRevoked?: boolean;
  driveToken?: string;
  dropboxEncrypted?: boolean;
  dropboxRevoked?: boolean;
  dropboxToken?: string;
  lastRemindingBackupTime?: number;
  offset?: number;
  oneDriveBusiness?: boolean;
  oneDriveEncrypted?: boolean;
  oneDriveRevoked?: boolean;
  oneDriveRefreshToken?: string;
  oneDriveToken?: string;
  storageLocation?: StorageLocation;

  // syncable settings
  advisorIgnoreList?: string[];
  autofill?: boolean;
  autolock?: number;
  enableContextMenu?: boolean;
  encodedPhrase?: string;
  smartFilter?: boolean;
  theme?: string;
  zoom?: number;
}

// Maybe we can have a better way to define this
const LocalUserSettingsDataKeys = [
  "driveEncrypted",
  "driveFolder",
  "driveRefreshToken",
  "driveRevoked",
  "driveToken",
  "dropboxEncrypted",
  "dropboxRevoked",
  "dropboxToken",
  "lastRemindingBackupTime",
  "offset",
  "oneDriveBusiness",
  "oneDriveEncrypted",
  "oneDriveRevoked",
  "oneDriveRefreshToken",
  "oneDriveToken",
  "storageLocation",
];

export class UserSettings {
  static items: UserSettingsData = {};

  static async updateItems() {
    UserSettings.items = await UserSettings.getAllItems();
  }

  static async convertFromLocalStorage(
    data: Storage,
    location: StorageLocation
  ) {
    const settings: UserSettingsData = {};

    for (const key in data) {
      if (
        [
          "autofill",
          "driveEncrypted",
          "driveRevoked",
          "dropboxEncrypted",
          "dropboxRevoked",
          "enableContextMenu",
          "oneDriveBusiness",
          "oneDriveEncrypted",
          "oneDriveRevoked",
          "smartFilter",
          "enableContextMenu",
        ].includes(key)
      ) {
        settings[
          key as
            | "autofill"
            | "driveEncrypted"
            | "driveRevoked"
            | "dropboxEncrypted"
            | "dropboxRevoked"
            | "enableContextMenu"
            | "oneDriveBusiness"
            | "oneDriveEncrypted"
            | "oneDriveRevoked"
            | "smartFilter"
            | "enableContextMenu"
        ] = data[key] === "true";
      } else if (
        ["autolock", "lastRemindingBackupTime", "offset", "zoom"].includes(key)
      ) {
        settings[
          key as "autolock" | "lastRemindingBackupTime" | "offset" | "zoom"
        ] = Number(data[key]);
      } else if (["advisorIgnoreList"].includes(key)) {
        settings[key as "advisorIgnoreList"] = JSON.parse(data[key]);
      } else {
        settings[key as keyof UserSettingsData] = data[key];
      }
    }

    settings.storageLocation = location;
    UserSettings.items = settings;
    await UserSettings.commitItems();
  }

  static async commitItems() {
    const storageLocation =
      UserSettings.items.storageLocation || StorageLocation.Local;

    if (storageLocation === StorageLocation.Local) {
      await chrome.storage[storageLocation].set({
        // JSON.parse(JSON.stringify()) strips functions (e.g. getItem, setItem, ...) which may have been added to the object.
        // Without this, a crash may occur as chrome.storage throws an error when trying to serialize a function.
        UserSettings: JSON.parse(JSON.stringify(UserSettings.items)),
      });
    } else {
      const { syncableSettings, localSettings } = UserSettings.splitSettings(
        UserSettings.items
      );

      await Promise.all([
        chrome.storage[StorageLocation.Local].set({
          UserSettings: JSON.parse(JSON.stringify(localSettings)),
        }),
        chrome.storage[StorageLocation.Sync].set({
          UserSettings: JSON.parse(JSON.stringify(syncableSettings)),
        }),
      ]);
    }

    await UserSettings.updateItems();
  }

  static async removeItem(key: keyof UserSettingsData) {
    const localSettings = await UserSettings.getStorageData(
      StorageLocation.Local
    );
    const storageLocation =
      localSettings.storageLocation || StorageLocation.Local;

    const location = LocalUserSettingsDataKeys.includes(key)
      ? StorageLocation.Local
      : storageLocation;
    const storageData: UserSettingsData =
      (await chrome.storage[location].get("UserSettings"))?.UserSettings || {};
    delete storageData[key];

    UserSettings.items = storageData;

    await UserSettings.commitItems();
  }

  private static async getStorageData(location: StorageLocation) {
    const storageData: UserSettingsData =
      (await chrome.storage[location].get("UserSettings"))?.UserSettings || {};

    return storageData;
  }

  private static splitSettings(storageData: UserSettingsData) {
    const syncableSettings: UserSettingsData = Object.assign({}, storageData);
    const localSettings: UserSettingsData = Object.assign({}, storageData);

    let key: keyof UserSettingsData;
    for (key in storageData) {
      if (LocalUserSettingsDataKeys.includes(key)) {
        delete syncableSettings[key];
      } else {
        delete localSettings[key];
      }
    }

    return {
      syncableSettings,
      localSettings,
    };
  }

  private static async getAllItems() {
    const localSettings = await UserSettings.getStorageData(
      StorageLocation.Local
    );
    const storageLocation =
      localSettings.storageLocation || StorageLocation.Local;

    if (storageLocation === StorageLocation.Local) {
      return localSettings;
    }

    const syncableSettings = await UserSettings.getStorageData(
      StorageLocation.Sync
    );
    return { ...syncableSettings, ...localSettings };
  }
}
