// Vue
import Vue from "vue";
import Vuex from "vuex";
import { Vue2Dragula } from "vue2-dragula";

// Components
import Popup from "./components/Popup.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { Style } from "./store/Style";
import { Accounts } from "./store/Accounts";
import { Backup } from "./store/Backup";
import { CurrentView } from "./store/CurrentView";
import { Menu } from "./store/Menu";
import { Notification } from "./store/Notification";
import { Qr } from "./store/Qr";
import { Advisor } from "./store/Advisor";
import { Dropbox, Drive, OneDrive } from "./models/backup";
import { syncTimeWithGoogle } from "./syncTime";
import { StorageLocation, UserSettings } from "./models/settings";

async function migrateLocalStorageToBrowserStorage() {
  if (localStorage.length > 0) {
    const location =
      (localStorage.storageLocation as StorageLocation) || StorageLocation.Sync;
    await UserSettings.convertFromLocalStorage(localStorage, location);
    localStorage.clear();
  }
}

async function init() {
  await migrateLocalStorageToBrowserStorage();
  await UserSettings.updateItems();

  // Add globals
  Vue.prototype.i18n = await loadI18nMessages();

  // Load modules
  Vue.use(Vuex);
  Vue.use(Vue2Dragula);

  // Load common components globally
  for (const component of CommonComponents) {
    Vue.component(component.name, component.component);
  }

  // State
  const store = new Vuex.Store({
    modules: {
      accounts: await new Accounts().getModule(),
      advisor: await new Advisor().getModule(),
      backup: await new Backup().getModule(),
      currentView: new CurrentView().getModule(),
      menu: await new Menu().getModule(),
      notification: new Notification().getModule(),
      qr: new Qr().getModule(),
      style: new Style().getModule(),
    },
  });

  // Render
  const instance = new Vue({
    render: (h) => h(Popup),
    store,
    mounted() {
      // Update time based entries' codes
      this.$store.commit("accounts/updateCodes");
      setInterval(() => {
        this.$store.commit("accounts/updateCodes");
      }, 1000);
    },
  }).$mount("#authenticator");

  // Prompt for password if needed
  if (instance.$store.state.accounts.shouldShowPassphrase) {
    // If we have cached password, use that
    if (instance.$store.state.accounts.encryption.getEncryptionStatus()) {
      instance.$store.commit("currentView/changeView", "LoadingPage");
      await instance.$store.dispatch("accounts/updateEntries");
    } else {
      instance.$store.commit("style/showInfo", true);
      instance.$store.commit("currentView/changeView", "EnterPasswordPage");
    }
  } else {
    // Set init complete if no encryption is present, otherwise this will be set in updateEntries.
    instance.$store.commit("accounts/initComplete");
  }

  // Auto focus on first entry
  document.querySelector<HTMLAnchorElement>("a.entry[tabindex='0']")?.focus();

  // Set document title
  try {
    document.title = instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }

  // Warn if legacy password is set
  if (UserSettings.items.encodedPhrase) {
    instance.$store.commit(
      "notification/alert",
      instance.i18n.local_passphrase_warning
    );
  }

  // Backup reminder / run backup
  const backupReminder = setInterval(() => {
    if (instance.$store.state.accounts.entries.length === 0) {
      return;
    }

    if (instance.$store.getters["accounts/currentlyEncrypted"]) {
      return;
    }

    clearInterval(backupReminder);

    const clientTime = Math.floor(new Date().getTime() / 1000 / 3600 / 24);
    if (!UserSettings.items.lastRemindingBackupTime) {
      UserSettings.items.lastRemindingBackupTime = clientTime;
      UserSettings.commitItems();
    } else if (
      clientTime - Number(UserSettings.items.lastRemindingBackupTime) >= 30 ||
      clientTime - Number(UserSettings.items.lastRemindingBackupTime) < 0
    ) {
      runScheduledBackup(clientTime, instance);
    }
    return;
  }, 5000);

  // Open search if '/' is pressed
  document.addEventListener(
    "keyup",
    (e) => {
      if (e.key === "/") {
        if (instance.$store.getters["style/isMenuShown"]) {
          return;
        }
        instance.$store.commit("accounts/stopFilter");
        // It won't focus the texfield if vue unhides the div
        instance.$store.commit("accounts/showSearch");
        const searchDiv = document.getElementById("search");
        const searchInput = document.getElementById("searchInput");
        if (!searchInput || !searchDiv) {
          return;
        }
        searchDiv.style.display = "block";
        searchInput.focus();
      }
    },
    false
  );

  // Show search box if more than 10 entries
  if (
    instance.$store.state.accounts.entries.length >= 10 &&
    !(
      instance.$store.getters["accounts/shouldFilter"] &&
      instance.$store.state.accounts.filter
    )
  ) {
    instance.$store.commit("accounts/showSearch");
  }

  const query = new URLSearchParams(document.location.search.substring(1));
  // Resize window to proper size if popup
  if (query.get("popup")) {
    const zoom = Number(UserSettings.items.zoom) / 100 || 1;
    const correctHeight = 480 * zoom;
    const correctWidth = 320 * zoom;
    if (
      window.innerHeight !== correctHeight ||
      window.innerWidth !== correctWidth
    ) {
      // window update to correct size
      const adjustedHeight =
        correctHeight + (window.outerHeight - window.innerHeight);
      const adjustedWidth =
        correctWidth + (window.outerWidth - window.innerWidth);
      chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {
        height: adjustedHeight,
        width: adjustedWidth,
      });
    }
  }

  // TODO: give an option for this
  chrome.permissions.contains(
    { origins: ["https://www.google.com/"] },
    (hasPermission) => {
      if (hasPermission) {
        syncTimeWithGoogle();
      }
    }
  );
}

init();

async function runScheduledBackup(clientTime: number, instance: Vue) {
  if (instance.$store.state.backup.dropboxToken) {
    chrome.permissions.contains(
      { origins: ["https://*.dropboxapi.com/*"] },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const dropbox = new Dropbox();
            const res = await dropbox.upload(
              instance.$store.state.accounts.encryption
            );
            if (res) {
              // we have uploaded backup to Dropbox
              // no need to remind
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.dropboxRevoked === true) {
              instance.$store.commit(
                "notification/alert",
                chrome.i18n.getMessage("token_revoked", ["Dropbox"])
              );
              UserSettings.items.dropboxRevoked = undefined;
              UserSettings.removeItem("dropboxRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        instance.$store.commit(
          "notification/alert",
          instance.i18n.remind_backup
        );
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      }
    );
  }
  if (instance.$store.state.backup.driveToken) {
    chrome.permissions.contains(
      {
        origins: [
          "https://www.googleapis.com/*",
          "https://accounts.google.com/o/oauth2/revoke",
        ],
      },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const drive = new Drive();
            const res = await drive.upload(
              instance.$store.state.accounts.encryption
            );
            if (res) {
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.driveRevoked === true) {
              instance.$store.commit(
                "notification/alert",
                chrome.i18n.getMessage("token_revoked", ["Google Drive"])
              );
              UserSettings.items.driveRevoked = undefined;
              UserSettings.removeItem("driveRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        instance.$store.commit(
          "notification/alert",
          instance.i18n.remind_backup
        );
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      }
    );
  }
  if (instance.$store.state.backup.oneDriveToken) {
    chrome.permissions.contains(
      {
        origins: [
          "https://graph.microsoft.com/me/*",
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        ],
      },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const onedrive = new OneDrive();
            const res = await onedrive.upload(
              instance.$store.state.accounts.encryption
            );
            if (res) {
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.oneDriveRevoked === true) {
              instance.$store.commit(
                "notification/alert",
                chrome.i18n.getMessage("token_revoked", ["OneDrive"])
              );
              UserSettings.items.oneDriveRevoked = undefined;
              UserSettings.removeItem("oneDriveRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        instance.$store.commit(
          "notification/alert",
          instance.i18n.remind_backup
        );
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      }
    );
  }
  if (
    !instance.$store.state.backup.driveToken &&
    !instance.$store.state.backup.dropboxToken &&
    !instance.$store.state.backup.oneDriveToken
  ) {
    instance.$store.commit("notification/alert", instance.i18n.remind_backup);
    UserSettings.items.lastRemindingBackupTime = clientTime;
    UserSettings.commitItems();
  }
}
