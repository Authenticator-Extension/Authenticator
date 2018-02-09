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

  updateCode(authenticator);
  setInterval(async () => {
    await updateCode(authenticator);
  }, 1000);

  // Remind backup
  const clientTime = Math.floor(new Date().getTime() / 1000 / 3600 / 24);
  if (!localStorage.lastRemindingBackupTime) {
    localStorage.lastRemindingBackupTime = clientTime;
  } else if (
      clientTime - localStorage.lastRemindingBackupTime >= 30 ||
      clientTime - localStorage.lastRemindingBackupTime < 0) {
    authenticator.message = authenticator.i18n.remind_backup;
    localStorage.lastRemindingBackupTime = clientTime;
  }

  return;
}

chrome.permissions.contains(
    {origins: ['https://www.google.com/']}, (hasPermission) => {
      if (hasPermission) {
        syncTimeWithGoogle();
      }
    });

init();