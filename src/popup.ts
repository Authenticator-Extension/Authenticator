// Vue
import Vue from "vue";
import Vuex from "vuex";
import { Vue2Dragula } from "vue2-dragula";

// Components
import Popup from "./components/Popup.vue";

// Other
import { loadI18nMessages } from "./store/i18n";
import { Style } from "./store/Style";
import { Accounts } from "./store/Accounts";
import { Backup } from "./store/Backup";
import { CurrentView } from "./store/CurrentView";
import { Menu } from "./store/Menu";
import { Notification } from "./store/Notification";
import { Qr } from "./store/Qr";
import { Dropbox, Drive } from "./models/backup";

async function init() {
  // Add globals
  Vue.prototype.i18n = await loadI18nMessages();

  // Load modules
  Vue.use(Vuex);
  Vue.use(Vue2Dragula);

  // State
  const store = new Vuex.Store({
    modules: {
      accounts: await new Accounts().getModule(),
      backup: new Backup().getModule(),
      currentView: new CurrentView().getModule(),
      menu: await new Menu().getModule(),
      notification: new Notification().getModule(),
      qr: new Qr().getModule(),
      style: new Style().getModule()
    }
  });

  // Render
  const instance = new Vue({
    render: h => h(Popup),
    store,
    mounted() {
      // Update time based entries' codes
      this.$store.commit("accounts/updateCodes");
      setInterval(() => {
        this.$store.commit("accounts/updateCodes");
      }, 1000);
    }
  }).$mount("#authenticator");

  // Prompt for password if needed
  if (instance.$store.state.accounts.shouldShowPassphrase) {
    instance.$store.commit("style/showInfo");
    instance.$store.commit("currentView/changeView", "EnterPasswordPage");
  }

  // Set document title
  try {
    document.title = instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }

  // Warn if legacy password is set
  if (localStorage.encodedPhrase) {
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
    if (!localStorage.lastRemindingBackupTime) {
      localStorage.lastRemindingBackupTime = clientTime;
    } else if (
      clientTime - localStorage.lastRemindingBackupTime >= 30 ||
      clientTime - localStorage.lastRemindingBackupTime < 0
    ) {
      runScheduledBackup(clientTime, instance);
    }
    return;
  }, 5000);

  // Open search if '/' is pressed
  document.addEventListener(
    "keyup",
    e => {
      if (e.key === "/") {
        if (instance.$store.state.style.style.fadein === true) {
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

  // Resize window to proper size if popup
  if (new URLSearchParams(document.location.search.substring(1)).get("popup")) {
    const zoom = Number(localStorage.zoom) / 100 || 1;
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
        width: adjustedWidth
      });
    }
  }

  // TODO: give an option for this
  chrome.permissions.contains(
    { origins: ["https://www.google.com/"] },
    hasPermission => {
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
      async hasPermission => {
        if (hasPermission) {
          try {
            const dropbox = new Dropbox();
            const res = await dropbox.upload(
              instance.$store.state.accounts.encryption
            );
            if (res) {
              // we have uploaded backup to Dropbox
              // no need to remind
              localStorage.lastRemindingBackupTime = clientTime;
              return;
            } else if (localStorage.dropboxRevoked === "true") {
              instance.$store.commit(
                "notification/alert",
                chrome.i18n.getMessage("token_revoked", ["Dropbox"])
              );
              localStorage.removeItem("dropboxRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        instance.$store.commit(
          "notification/alert",
          instance.i18n.remind_backup
        );
        localStorage.lastRemindingBackupTime = clientTime;
      }
    );
  }
  if (instance.$store.state.backup.driveToken) {
    chrome.permissions.contains(
      {
        origins: [
          "https://www.googleapis.com/*",
          "https://accounts.google.com/o/oauth2/revoke"
        ]
      },
      async hasPermission => {
        if (hasPermission) {
          try {
            const drive = new Drive();
            const res = await drive.upload(
              instance.$store.state.accounts.encryption
            );
            if (res) {
              localStorage.lastRemindingBackupTime = clientTime;
              return;
            } else if (localStorage.driveRevoked === "true") {
              instance.$store.commit(
                "notification/alert",
                chrome.i18n.getMessage("token_revoked", ["Google Drive"])
              );
              localStorage.removeItem("driveRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        instance.$store.commit(
          "notification/alert",
          instance.i18n.remind_backup
        );
        localStorage.lastRemindingBackupTime = clientTime;
      }
    );
  }
  if (
    !instance.$store.state.backup.driveToken &&
    !instance.$store.state.backup.dropboxToken
  ) {
    instance.$store.commit("notification/alert", instance.i18n.remind_backup);
    localStorage.lastRemindingBackupTime = clientTime;
  }
}

export function syncTimeWithGoogle() {
  return new Promise(
    (resolve: (value: string) => void, reject: (reason: Error) => void) => {
      try {
        // tslint:disable-next-line:ban-ts-ignore
        // @ts-ignore
        const xhr = new XMLHttpRequest({ mozAnon: true });
        xhr.open("HEAD", "https://www.google.com/generate_204");
        const xhrAbort = setTimeout(() => {
          xhr.abort();
          return resolve("updateFailure");
        }, 5000);
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            clearTimeout(xhrAbort);
            const date = xhr.getResponseHeader("date");
            if (!date) {
              return resolve("updateFailure");
            }
            const serverTime = new Date(date).getTime();
            const clientTime = new Date().getTime();
            const offset = Math.round((serverTime - clientTime) / 1000);

            if (Math.abs(offset) <= 300) {
              // within 5 minutes
              localStorage.offset = Math.round(
                (serverTime - clientTime) / 1000
              );
              return resolve("updateSuccess");
            } else {
              return resolve("clock_too_far_off");
            }
          }
        };
        xhr.send();
      } catch (error) {
        return reject(error);
      }
    }
  );
}
