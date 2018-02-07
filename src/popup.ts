/* tslint:disable:no-reference */
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />

// need to find a better way to handle Vue types without modules
// we use vue 1.0 here to solve csp issues
/* tslint:disable-next-line:no-any */
declare var Vue: any;

/* tslint:disable-next-line:no-any */
declare var QRCode: any;

async function getEntries(encryption: Encryption) {
  const optEntries: OTPEntry[] = await EntryStorage.get(encryption);
  return optEntries;
}

function getVersion() {
  return chrome.runtime.getManifest().version;
}

async function loadI18nMessages() {
  return new Promise(
      (resolve: (value: {[key: string]: string}) => void,
       reject: (reason: Error) => void) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              const i18nMessage: I18nMessage = JSON.parse(xhr.responseText);
              const i18nData: {[key: string]: string} = {};
              for (const key of Object.keys(i18nMessage)) {
                i18nData[key] = chrome.i18n.getMessage(key);
              }
              return resolve(i18nData);
            }
            return;
          };
          xhr.open(
              'GET', chrome.extension.getURL('/_locales/en/messages.json'));
          xhr.send();
        } catch (error) {
          return reject(error);
        }
      });
}

async function syncTimeWithGoogle() {
  return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('HEAD', 'https://www.google.com/generate_204');
          const xhrAbort = setTimeout(() => {
            xhr.abort();
            return resolve('updateFailure');
          }, 5000);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              clearTimeout(xhrAbort);
              const date = xhr.getResponseHeader('date');
              if (!date) {
                return resolve('updateFailure');
              }
              const serverTime = new Date(date).getTime();
              const clientTime = new Date().getTime();
              const offset = Math.round((serverTime - clientTime) / 1000);

              if (Math.abs(offset) <= 300) {  // within 5 minutes
                localStorage.offset =
                    Math.round((serverTime - clientTime) / 1000);
                return resolve('updateSuccess');
              } else {
                return resolve('clock_too_far_off');
              }
            }
          };
          xhr.send();
        } catch (error) {
          return reject(error);
        }
      });
}

/* tslint:disable-next-line:no-any */
async function updateCode(app: any) {
  let second = new Date().getSeconds();
  if (localStorage.offset) {
    second += Number(localStorage.offset) + 30;
  }
  second = second % 30;
  app.sector = getSector(second);
  if (second > 25) {
    app.class.timeout = true;
  } else {
    app.class.timeout = false;
  }
  if (second < 1) {
    const entries = app.entries as OTP[];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].type !== OTPType.hotp) {
        entries[i].generate();
      }
    }
  }
}

function getSector(second: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.arc(
      20, 20, 16, second / 30 * Math.PI * 2 - Math.PI / 2, Math.PI * 3 / 2,
      false);
  ctx.fill();
  const url = canvas.toDataURL();
  return `url(${url}) center / 20px 20px`;
}

function resize(zoom: number) {
  if (zoom !== 100) {
    document.body.style.marginBottom = 480 * (zoom / 100 - 1) + 'px';
    document.body.style.marginRight = 320 * (zoom / 100 - 1) + 'px';
    document.body.style.transform = 'scale(' + (zoom / 100) + ')';
  }
}

async function getQrUrl(entry: OTPEntry) {
  return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        const label =
            entry.issuer ? (entry.issuer + ':' + entry.account) : entry.account;
        const type = entry.type === OTPType.hex ? OTPType[OTPType.totp] :
                                                  OTPType[entry.type];
        const otpauth = 'otpauth://' + type + '/' + label +
            '?secret=' + entry.secret +
            (entry.issuer ? ('&issuer=' + entry.issuer.split('::')[0]) : '') +
            ((entry.type === OTPType.hotp) ? ('&counter=' + entry.counter) :
                                             '');
        /* tslint:disable-next-line:no-unused-expression */
        new QRCode(
            'qr', {
              text: otpauth,
              width: 128,
              height: 128,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.L
            },
            resolve);
        return;
      });
}

function isCustomEvent(event: Event): event is CustomEvent {
  return 'detail' in event;
}

async function init() {
  const zoom = Number(localStorage.zoom) || 100;
  resize(zoom);

  const version = getVersion();
  const i18n = await loadI18nMessages();
  const encryption: Encryption = new Encryption('');
  const shouldShowPassphrase = await EntryStorage.hasEncryptedEntrie();
  const exportData =
      shouldShowPassphrase ? {} : await EntryStorage.getExport(encryption);
  const entries = shouldShowPassphrase ? [] : await getEntries(encryption);

  const authenticator = new Vue({
    el: '#authenticator',
    data: {
      version,
      i18n,
      entries,
      encryption,
      zoom,
      OTPType,
      exportData: JSON.stringify(exportData, null, 2),
      class: {
        timeout: false,
        edit: false,
        slidein: false,
        slideout: false,
        fadein: false,
        fadeout: false,
        qrfadein: false,
        qrfadeout: false,
        notificationFadein: false,
        notificationFadeout: false,
        hotpDiabled: false
      },
      sector: '',
      info: '',
      message: '',
      confirmMessage: '',
      qr: '',
      notification: '',
      passphrase: '',
      notificationTimeout: 0,
      newAccount: {show: false, account: '', secret: '', type: OTPType.totp},
      newPassphrase: {phrase: '', confirm: ''}
    },
    methods: {
      showBulls: (code: string) => {
        return new Array(code.length).fill('&bull;').join('');
      },
      showMenu: () => {
        authenticator.class.slidein = true;
        authenticator.class.slideout = false;
        return;
      },
      closeMenu: () => {
        authenticator.class.slidein = false;
        authenticator.class.slideout = true;
        setTimeout(() => {
          authenticator.class.slideout = false;
        }, 200);
        return;
      },
      showInfo: (tab: string) => {
        authenticator.class.fadein = true;
        authenticator.class.fadeout = false;
        authenticator.info = tab;
        return;
      },
      closeInfo: () => {
        authenticator.class.fadein = false;
        authenticator.class.fadeout = true;
        setTimeout(() => {
          authenticator.class.fadeout = false;
          authenticator.info = '';
          authenticator.newAccount.show = false;
        }, 200);
        return;
      },
      importEnties: async () => {
        await EntryStorage.import(
            authenticator.encryption, JSON.parse(authenticator.exportData));
        await authenticator.updateEntries();
        authenticator.message = authenticator.i18n.updateSuccess;
        return;
      },
      updateEntries: async () => {
        const exportData =
            await EntryStorage.getExport(authenticator.encryption);
        authenticator.exportData = JSON.stringify(exportData, null, 2);
        authenticator.entries = await getEntries(authenticator.encryption);
        updateCode(authenticator);
        return;
      },
      saveZoom: () => {
        localStorage.zoom = authenticator.zoom;
        resize(authenticator.zoom);
        return;
      },
      removeEntry: async (entry: OTPEntry) => {
        if (await authenticator.confirm(authenticator.i18n.confirm_delete)) {
          await entry.delete();
          await authenticator.updateEntries();
        }
        return;
      },
      syncClock: async () => {
        chrome.permissions.request(
            {origins: ['https://www.google.com/']}, async (granted) => {
              if (granted) {
                const message = await syncTimeWithGoogle();
                authenticator.message = authenticator.i18n[message];
              }
              return;
            });
        return;
      },
      editEntry: () => {
        authenticator.class.edit = !authenticator.class.edit;
        const codes = document.getElementById('codes');
        if (codes) {
          // wait vue apply changes to dom
          setTimeout(() => {
            codes.scrollTop = authenticator.class.edit ? codes.scrollHeight : 0;
          }, 0);
        }
        return;
      },
      shouldShowQrIcon: (entry: OTPEntry) => {
        return entry.secret !== 'Encrypted' && entry.type !== OTPType.battle &&
            entry.type !== OTPType.steam;
      },
      showQr: async (entry: OTPEntry) => {
        const qrUrl = await getQrUrl(entry);
        authenticator.qr = `url(${qrUrl})`;
        authenticator.class.qrfadein = true;
        authenticator.class.qrfadeout = false;
        return;
      },
      hideQr: () => {
        authenticator.class.qrfadein = false;
        authenticator.class.qrfadeout = true;
        setTimeout(() => {
          authenticator.class.qrfadeout = false;
        }, 200);
        return;
      },
      copyCode: (entry: OTPEntry) => {
        if (authenticator.class.edit) {
          return;
        }

        if (entry.code === 'Encrypted') {
          authenticator.showInfo('passphrase');
          return;
        }
        chrome.permissions.request(
            {permissions: ['clipboardWrite']}, (granted) => {
              if (granted) {
                const codeClipboard = document.getElementById(
                                          'codeClipboard') as HTMLInputElement;
                if (!codeClipboard) {
                  return;
                }
                codeClipboard.value = entry.code;
                codeClipboard.focus();
                codeClipboard.select();
                document.execCommand('Copy');
                authenticator.notification = authenticator.i18n.copied;
                clearTimeout(authenticator.notificationTimeout);
                authenticator.class.notificationFadein = true;
                authenticator.class.notificationFadeout = false;
                authenticator.notificationTimeout = setTimeout(() => {
                  authenticator.class.notificationFadein = false;
                  authenticator.class.notificationFadeout = true;
                  setTimeout(() => {
                    authenticator.class.notificationFadeout = false;
                  }, 200);
                }, 1000);
              }
            });
        return;
      },
      addNewAccount: async () => {
        let type: OTPType;
        if (!/^[a-z2-7]+=*$/i.test(authenticator.newAccount.secret) &&
            /^[0-9a-f]+$/i.test(authenticator.newAccount.secret)) {
          type = OTPType.hex;
        } else {
          type = authenticator.newAccount.type;
        }

        const entry = new OTPEntry(
            type, '', authenticator.newAccount.secret,
            authenticator.newAccount.account, 0, 0);
        await entry.create(authenticator.encryption);
        await authenticator.updateEntries();
        authenticator.newAccount.type = OTPType.totp;
        authenticator.account = '';
        authenticator.secret = '';
        authenticator.newAccount.show = false;
        authenticator.closeInfo();
        authenticator.class.edit = false;

        const codes = document.getElementById('codes');
        if (codes) {
          // wait vue apply changes to dom
          setTimeout(() => {
            codes.scrollTop = 0;
          }, 0);
        }
        return;
      },
      confirm: async (message: string) => {
        return new Promise(
            (resolve: (value: boolean) => void,
             reject: (reason: Error) => void) => {
              authenticator.confirmMessage = message;
              window.addEventListener('confirm', (event) => {
                authenticator.confirmMessage = '';
                if (!isCustomEvent(event)) {
                  return resolve(false);
                }
                return resolve(event.detail);
              });
              return;
            });
      },
      confirmOK: () => {
        const confirmEvent = new CustomEvent('confirm', {detail: true});
        window.dispatchEvent(confirmEvent);
        return;
      },
      confirmCancel: () => {
        const confirmEvent = new CustomEvent('confirm', {detail: false});
        window.dispatchEvent(confirmEvent);
        return;
      },
      nextCode: async (entry: OTPEntry) => {
        if (authenticator.class.hotpDiabled) {
          return;
        }
        authenticator.class.hotpDiabled = true;
        await entry.next(authenticator.encryption);
        await authenticator.updateEntries();
        setTimeout(() => {
          authenticator.class.hotpDiabled = false;
        }, 3000);
        return;
      },
      applyPassphrase: async () => {
        authenticator.encryption.updateEncryptionPassword(
            authenticator.passphrase);
        await authenticator.updateEntries();
        authenticator.closeInfo();
        return;
      },
      changePassphrase: async () => {
        if (authenticator.newPassphrase.phrase !==
            authenticator.newPassphrase.confirm) {
          authenticator.message = authenticator.i18n.phrase_not_match;
          return;
        }
        authenticator.encryption.updateEncryptionPassword(
            authenticator.newPassphrase.phrase);
        await authenticator.importEnties();
        return;
      },
      beginCapture: () => {
        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
          const tab = tabs[0];
          if (!tab || !tab.id) {
            return;
          }
          chrome.tabs.sendMessage(tab.id, {action: 'capture'}, (result) => {
            if (result !== 'beginCapture') {
              authenticator.message = authenticator.i18n.capture_failed;
            } else {
              window.close();
            }
          });
        });
        return;
      }
    }
  });

  if (shouldShowPassphrase) {
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
