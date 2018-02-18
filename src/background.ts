/* tslint:disable:no-reference */
/// <reference path="../js/jsqrcode/index.d.ts" />
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'position') {
    if (!sender.tab) {
      return;
    }
    getQr(
        sender.tab, message.info.left, message.info.top, message.info.width,
        message.info.height, message.info.windowWidth, message.info.passphrase);
  }
});

let contentTab: chrome.tabs.Tab;

function getQr(
    tab: chrome.tabs.Tab, left: number, top: number, width: number,
    height: number, windowWidth: number, passphrase: string) {
  chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, (dataUrl) => {
    contentTab = tab;
    const qr = new Image();
    qr.src = dataUrl;
    qr.onload = () => {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = width;
      captureCanvas.height = height;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(qr, left, top, width, height, 0, 0, width, height);
      const url = captureCanvas.toDataURL();
      qrcode.callback = (text) => {
        getTotp(text, passphrase);
      };
      qrcode.decode(url);
    };
  });
}

async function getTotp(text: string, passphrase: string) {
  const id = contentTab.id;
  if (!id) {
    return;
  }

  if (text.indexOf('otpauth://') !== 0) {
    if (text === 'error decoding QR Code') {
      chrome.tabs.sendMessage(id, {action: 'errorqr'});
    } else {
      chrome.tabs.sendMessage(id, {action: 'text', text});
    }
  } else {
    let uri = text.split('otpauth://')[1];
    let type = uri.substr(0, 4).toLowerCase();
    uri = uri.substr(5);
    let label = uri.split('?')[0];
    const parameterPart = uri.split('?')[1];
    if (!label || !parameterPart) {
      chrome.tabs.sendMessage(id, {action: 'errorqr'});
    } else {
      let account = '';
      let secret = '';
      let issuer = '';

      label = decodeURIComponent(label);
      if (label.indexOf(':') !== -1) {
        issuer = label.split(':')[0];
        account = label.split(':')[1];
      } else {
        account = label;
      }
      const parameters = parameterPart.split('&');
      parameters.forEach((item) => {
        const parameter = item.split('=');
        if (parameter[0].toLowerCase() === 'secret') {
          secret = parameter[1];
        } else if (parameter[0].toLowerCase() === 'issuer') {
          issuer = parameter[1];
        } else if (parameter[0].toLowerCase() === 'counter') {
          let counter = Number(parameter[1]);
          counter = (isNaN(counter) || counter < 0) ? 0 : counter;
        }
      });

      if (!secret) {
        chrome.tabs.sendMessage(id, {action: 'errorqr'});
      } else if (
          !/^[0-9a-f]+$/i.test(secret) && !/^[2-7a-z]+=*$/i.test(secret)) {
        chrome.tabs.sendMessage(id, {action: 'secretqr', secret});
      } else {
        const encryption = new Encryption(passphrase);
        const hash = CryptoJS.MD5(secret).toString();
        if (!/^[2-7a-z]+=*$/i.test(secret) && /^[0-9a-f]+$/i.test(secret)) {
          type = 'hex';
        }
        const entryData: {[hash: string]: OTPStorage} = {};
        entryData[hash] = {
          account,
          hash,
          issuer,
          secret,
          type,
          encrypted: false,
          index: 0,
          counter: 0
        };
        await EntryStorage.import(encryption, entryData);
        chrome.tabs.sendMessage(id, {action: 'added', account});
      }
    }
  }
  return;
}