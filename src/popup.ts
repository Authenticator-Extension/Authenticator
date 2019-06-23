/*
import { addAccount } from './ui/add-account';
import { backup } from './ui/backup';
import { className } from './ui/class';
import { entry } from './ui/entry';
import { i18n } from './ui/i18n';
import { info } from './ui/info';
import { menu, syncTimeWithGoogle } from './ui/menu';
import { message } from './ui/message';
import { passphrase } from './ui/passphrase';
import { qr } from './ui/qr';
import { UI } from './ui/ui';
import Authenticator from './view/popup.vue';

async function init() {
  const ui = new UI(Authenticator, { el: '#authenticator' });

  const authenticator = await ui
    .load(className)
    .load(i18n)
    .load(menu)
    .load(info)
    .load(passphrase)
    .load(entry)
    .load(qr)
    .load(message)
    .load(addAccount)
    .load(backup)
    .render();

  try {
    document.title = ui.instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }

  if (authenticator.shouldShowPassphrase) {
    authenticator.showInfo('passphrase');
  }

  // localStorage passphrase warning
  if (localStorage.encodedPhrase) {
    authenticator.alert(authenticator.i18n.local_passphrase_warning);
  }

  // Remind backup
  const backupReminder = setInterval(() => {
    if (authenticator.entries.length === 0) {
      return;
    }

    for (let i = 0; i < authenticator.entries.length; i++) {
      if (authenticator.entries[i].secret === 'Encrypted') {
        return;
      }
    }

    clearInterval(backupReminder);

    const clientTime = Math.floor(new Date().getTime() / 1000 / 3600 / 24);
    if (!localStorage.lastRemindingBackupTime) {
      localStorage.lastRemindingBackupTime = clientTime;
    } else if (
      clientTime - localStorage.lastRemindingBackupTime >= 30 ||
      clientTime - localStorage.lastRemindingBackupTime < 0
    ) {
      // backup to cloud
      authenticator.runScheduledBackup(clientTime);
    }
    return;
  }, 1000);

  document.addEventListener(
    'keyup',
    e => {
      ui.instance.searchListener(e);
    },
    false
  );

  if (
    ui.instance.entries.length >= 10 &&
    !(ui.instance.shouldFilter && ui.instance.filter)
  ) {
    ui.instance.showSearch = true;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (['dropboxtoken', 'drivetoken'].indexOf(message.action) > -1) {
      if (message.action === 'dropboxtoken') {
        authenticator.dropboxToken = message.value;
      } else if (message.action === 'drivetoken') {
        authenticator.driveToken = message.value;
      }
      authenticator.backupUpload(
        String(message.action).substring(
          0,
          String(message.action).indexOf('token')
        )
      );
      if (['dropbox', 'drive'].indexOf(authenticator.info) > -1) {
        setTimeout(authenticator.closeInfo, 500);
      }
    }
  });

  if (ui.instance.isPopup() && !ui.instance.isEdge()) {
    ui.instance.fixPopupSize();
  }

  return;
}

if (navigator.userAgent.indexOf('Edge') !== -1) {
  syncTimeWithGoogle();
} else {
  chrome.permissions.contains(
    { origins: ['https://www.google.com/'] },
    hasPermission => {
      if (hasPermission) {
        syncTimeWithGoogle();
      }
    }
  );
}

init();
*/

// Vue
import Vue from 'vue';
import Vuex from 'vuex';
import { Vue2Dragula } from 'vue2-dragula';

// Components
import Popup from './components/Popup.vue';

// Other
import { loadI18nMessages } from './state-temp/i18n';
import { Style } from './state-temp/Style';
import { Accounts } from './state-temp/Accounts';
import { Backup } from './state-temp/Backup';
import { CurrentView } from './state-temp/CurrentView';
import { Menu } from './state-temp/Menu';
import { Notification } from './state-temp/Notification';
import { Password } from './state-temp/Password';
import { Qr } from './state-temp/Qr';
import { Managed } from './state-temp/Managed';

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
      password: new Password().getModule(),
      qr: new Qr().getModule(),
      style: new Style().getModule(),
      managed: await new Managed().getModule(),
    },
  });

  // Render
  const instance = new Vue({
    render: h => h(Popup),
    store,
    mounted: () => {
      // Dragula stuff here
    },
  }).$mount('#authenticator');
}

init();
