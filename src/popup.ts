/* tslint:disable:no-reference */
/// <reference path="./models/interface.ts" />

// need to find a better way to handle Vue types without modules
// we use vue 1.0 here to solve csp issues
/* tslint:disable-next-line:no-any */
declare var Vue: any;

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

async function getDataFromBackground<T>(command: {}) {
  return new Promise(
      (resolve: (value: T) => void, reject: (reason: Error) => void) => {
        chrome.runtime.sendMessage(command, (response: T) => {
          return resolve(response);
        });
      });
}

async function getEntries() {
  const entries: OTP[] =
      await getDataFromBackground<OTP[]>({action: 'GET_ENTRIES'});
  return entries;
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
    app.entries = await getEntries();
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

async function init() {
  const i18n = await loadI18nMessages();
  const entries = await getEntries();

  const authenticator = new Vue({
    el: '#authenticator',
    data: {i18n, entries, class: {timeout: false, edit: false}, sector: ''},
    methods: {
      showBulls: (code: string) => {
        return new Array(code.length).fill('&bull;').join('');
      }
    }
  });

  updateCode(authenticator);
  setInterval(async () => {
    await updateCode(authenticator);
  }, 1000);
  return;
}

init();