/* tslint:disable:no-reference */
/// <reference path="./ui/i18n.ts" />
/// <reference path="./ui/menu.ts" />
/// <reference path="./ui/info.ts" />
/// <reference path="./ui/passphrase.ts" />
/// <reference path="./ui/entry.ts" />
/// <reference path="./ui/qr.ts" />
/// <reference path="./ui/message.ts" />
/// <reference path="./ui/add-account.ts" />
/// <reference path="./ui/class.ts" />
/// <reference path="./ui/ui.ts" />
/// <reference path="./models/dropbox.ts" />

async function init() {
  const ui = new UI({el: '#authenticator'});

  await className(ui);
  await i18n(ui);
  await menu(ui);
  await info(ui);
  await passphrase(ui);
  await entry(ui);
  await qr(ui);
  await message(ui);
  await addAccount(ui);

  const authenticator = ui.generate();

  if (authenticator.shouldShowPassphrase) {
    authenticator.showInfo('passphrase');
  }

  // localStorage passphrase warning
  if (localStorage.encodedPhrase !== null) {
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
        clientTime - localStorage.lastRemindingBackupTime < 0) {
      // backup to Dropbox
      if (authenticator.dropboxToken) {
        chrome.permissions.contains(
            {origins: ['https://*.dropboxapi.com/*']},
            async (hasPermission) => {
              if (hasPermission) {
                try {
                  const dropbox = new Dropbox();
                  const res = await dropbox.upload(authenticator.encryption);
                  if (res) {
                    // we have uploaded backup to Dropbox
                    // no need to remind
                    localStorage.lastRemindingBackupTime = clientTime;
                    return;
                  }
                } catch (error) {
                  // ignore
                }
              }
              authenticator.alert(authenticator.i18n.remind_backup);
              localStorage.lastRemindingBackupTime = clientTime;
            });
      } else {
        authenticator.alert(authenticator.i18n.remind_backup);
        localStorage.lastRemindingBackupTime = clientTime;
      }
    }
    return;
  }, 1000);

  return;
}

chrome.permissions.contains(
    {origins: ['https://www.google.com/']}, (hasPermission) => {
      if (hasPermission) {
        syncTimeWithGoogle();
      }
    });

init();
