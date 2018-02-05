/* tslint:disable:no-reference */
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />

// need to find a better way to handle Vue types without modules
// we use vue 1.0 here to solve csp issues
/* tslint:disable-next-line:no-any */
declare var Vue: any;

async function getEntries(encryption: Encription) {
  const optEntries: OTP[] = await EntryStorage.get(encryption);
  return optEntries;
}

async function getVersion() {
  return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              const manifest: {version: string} = JSON.parse(xhr.responseText);
              return resolve(manifest.version);
            }
            return;
          };
          xhr.open('GET', chrome.extension.getURL('/manifest.json'));
          xhr.send();
        } catch (error) {
          return reject(error);
        }
      });
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
      entries[i].generate();
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

async function init() {
  const zoom = Number(localStorage.zoom) || 100;
  resize(zoom);

  const version = await getVersion();
  const i18n = await loadI18nMessages();
  const encryption = new Encription('');
  const entries = await getEntries(encryption);
  const exportData = await EntryStorage.getExport();

  const authenticator = new Vue({
    el: '#authenticator',
    data: {
      version,
      i18n,
      entries,
      encryption,
      exportData,
      zoom,
      class: {
        timeout: false,
        edit: false,
        slidein: false,
        slideout: false,
        fadein: false,
        fadeout: false
      },
      sector: '',
      info: '',
      message: ''
    },
    methods: {
      showBulls: (code: string) => {
        return new Array(code.length).fill('&bull;').join('');
      },
      updateEncription: (password: string) => {
        authenticator.encryption = new Encription(password);
      },
      showMenu: () => {
        authenticator.class.slidein = true;
        authenticator.class.slideout = false;
      },
      closeMenu: () => {
        authenticator.class.slidein = false;
        authenticator.class.slideout = true;
        setTimeout(() => {
          authenticator.class.slideout = false;
        }, 200);
      },
      showInfo: (tab: string) => {
        authenticator.class.fadein = true;
        authenticator.class.fadeout = false;
        authenticator.info = tab;
      },
      closeInfo: () => {
        authenticator.class.fadein = false;
        authenticator.class.fadeout = true;
        setTimeout(() => {
          authenticator.class.fadeout = false;
          authenticator.info = '';
        }, 200);
      },
      updateEntries: async () => {
        await EntryStorage.import(JSON.parse(authenticator.exportData));
        authenticator.entries = await getEntries(authenticator.encryption);
        updateCode(authenticator);
        authenticator.message = authenticator.i18n.updateSuccess;
      },
      saveZoom: () => {
        localStorage.zoom = authenticator.zoom;
        resize(authenticator.zoom);
      },
      removeEntry: async (entry: OTPEntry) => {
        if (confirm('Remove?')) {
          await entry.delete();
          authenticator.exportData = await EntryStorage.getExport();
          authenticator.entries = await getEntries(authenticator.encryption);
          updateCode(authenticator);
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
      }
    }
  });

  updateCode(authenticator);
  setInterval(async () => {
    await updateCode(authenticator);
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