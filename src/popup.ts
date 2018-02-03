/* tslint:disable:no-reference */
/// <reference path="./models/interface.ts" />

// need to find a better way to handle Vue types without modules
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

async function init() {
  const i18n = await loadI18nMessages();
  const entries = await getEntries();

  const authenticator =
      new Vue({el: '#authenticator', data: {i18n, entries}, methods: {}});

  // setInterval(async () => {
  //   authenticator.entries = await getEntries();
  // }, 1000);
  return;
}

init();