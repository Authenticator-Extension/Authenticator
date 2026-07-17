// Vue
import { createApp, h, ComponentPublicInstance } from "vue";
import { createPinia, setActivePinia } from "pinia";

// Components
import Popup from "./components/Popup.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { useStyleStore } from "./store/Style";
import { useAccountsStore } from "./store/Accounts";
import { useBackupStore } from "./store/Backup";
import { useCurrentViewStore } from "./store/CurrentView";
import { useMenuStore } from "./store/Menu";
import { useNotificationStore } from "./store/Notification";
import { useAdvisorStore } from "./store/Advisor";
import { Dropbox, OneDrive } from "./models/backup";
import { Encryption } from "./models/encryption";
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

  // Pinia (Wave 1: style/currentView/qr; Wave 2: backup/advisor/menu/
  // notification/permissions; Wave 3: accounts migrated off Vuex — Vuex is
  // now fully removed). Must be active before any useXxxStore() call,
  // including the ones below that run outside a component (this init()
  // function itself).
  const pinia = createPinia();
  setActivePinia(pinia);
  const accountsStore = useAccountsStore();
  const styleStore = useStyleStore();
  const currentViewStore = useCurrentViewStore();
  const backupStore = useBackupStore();
  const menuStore = useMenuStore();
  const notificationStore = useNotificationStore();
  const advisorStore = useAdvisorStore();

  // Accounts loads its async state (cached key, entries, exports) from storage;
  // await it first — the old Vuex build awaited new Accounts().getModule()
  // before the other modules, and mount() must never see the pre-init defaults.
  await accountsStore.init();

  // Backup/Menu/Advisor read UserSettings/ManagedStorage asynchronously
  // (the old Vuex modules did the same via async getModule()). Await them
  // here, in the same order the old `modules: {...}` object literal awaited
  // them, so mount() never observes the pre-init defaults.
  await advisorStore.init();
  await backupStore.init();
  await menuStore.init();

  // Render
  const app = createApp({
    render: () => h(Popup),
    mounted() {
      // Update time based entries' codes
      accountsStore.updateCodes();
      setInterval(() => {
        accountsStore.updateCodes();
      }, 1000);
    },
  });

  app.use(pinia);
  // Add globals
  app.config.globalProperties.i18n = await loadI18nMessages();
  // Load common components globally
  for (const component of CommonComponents) {
    app.component(component.name, component.component);
  }

  const instance = app.mount("#authenticator");

  // Prompt for password if needed
  if (accountsStore.shouldShowPassphrase) {
    // If we have cached password, use that
    if (accountsStore.defaultEncryption) {
      currentViewStore.changeView("LoadingPage");
      await accountsStore.updateEntries();
    } else {
      styleStore.showInfo(true);
      currentViewStore.changeView("EnterPasswordPage");
    }
  } else {
    // Set init complete if no encryption is present, otherwise this will be set in updateEntries.
    accountsStore.setInitComplete();
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
    notificationStore.alert(instance.i18n.local_passphrase_warning);
  }

  // Backup reminder / run backup
  const backupReminder = setInterval(() => {
    if (accountsStore.entries.length === 0) {
      return;
    }

    if (accountsStore.currentlyEncrypted) {
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
        if (styleStore.isMenuShown) {
          return;
        }
        accountsStore.stopFilter();
        // It won't focus the texfield if vue unhides the div
        accountsStore.setShowSearch();
        const searchDiv = document.getElementById("search");
        const searchInput = document.getElementById("searchInput");
        if (!searchInput || !searchDiv) {
          return;
        }
        // force-show before Vue re-renders so focus() lands; must match the
        // search box's flex layout (display:block would break it — #1)
        searchDiv.style.display = "flex";
        searchInput.focus();
      }
    },
    false,
  );

  // Show search box if more than 10 entries
  if (
    accountsStore.entries.length >= 10 &&
    !(accountsStore.shouldFilter && accountsStore.filter)
  ) {
    accountsStore.setShowSearch();
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
    },
  );
}

init();

async function runScheduledBackup(
  clientTime: number,
  instance: ComponentPublicInstance,
) {
  // A scheduled cloud backup without a master password would upload plaintext
  // secrets; skip it entirely. The UI prompts the user to set a password first.
  const accountsStore = useAccountsStore();
  if (!accountsStore.defaultEncryption) {
    return;
  }
  const backupStore = useBackupStore();
  const notificationStore = useNotificationStore();
  if (backupStore.dropboxToken) {
    chrome.permissions.contains(
      { origins: ["https://*.dropboxapi.com/*"] },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const dropbox = new Dropbox();
            // map values are real Encryption instances; the store types them as
            // the EncryptionInterface, so narrow for upload()'s concrete param.
            const res = await dropbox.upload(
              accountsStore.encryption.get(
                accountsStore.defaultEncryption,
              ) as Encryption,
            );
            if (res) {
              // we have uploaded backup to Dropbox
              // no need to remind
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.dropboxRevoked === true) {
              notificationStore.alert(
                chrome.i18n.getMessage("token_revoked", ["Dropbox"]),
              );
              UserSettings.items.dropboxRevoked = undefined;
              UserSettings.removeItem("dropboxRevoked");
            }
          } catch (error) {
            // a failed scheduled backup shouldn't be completely silent
            console.error("Scheduled backup failed", error);
          }
        }
        notificationStore.alert(instance.i18n.remind_backup);
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      },
    );
  }
  if (backupStore.oneDriveToken) {
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
              accountsStore.encryption.get(
                accountsStore.defaultEncryption,
              ) as Encryption,
            );
            if (res) {
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.oneDriveRevoked === true) {
              notificationStore.alert(
                chrome.i18n.getMessage("token_revoked", ["OneDrive"]),
              );
              UserSettings.items.oneDriveRevoked = undefined;
              UserSettings.removeItem("oneDriveRevoked");
            }
          } catch (error) {
            // a failed scheduled backup shouldn't be completely silent
            console.error("Scheduled backup failed", error);
          }
        }
        notificationStore.alert(instance.i18n.remind_backup);
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      },
    );
  }
  if (
    !backupStore.driveToken &&
    !backupStore.dropboxToken &&
    !backupStore.oneDriveToken
  ) {
    notificationStore.alert(instance.i18n.remind_backup);
    UserSettings.items.lastRemindingBackupTime = clientTime;
    UserSettings.commitItems();
  }
}
