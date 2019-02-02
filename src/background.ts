/* tslint:disable:no-reference */
/// <reference path="../js/jsqrcode/index.d.ts" />
/// <reference path="./models/encryption.ts" />
/// <reference path="./models/interface.ts" />
/// <reference path="./models/storage.ts" />
/// <reference path="./models/credentials.ts" />

let cachedPassphrase = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'position') {
    if (!sender.tab) {
      return;
    }
    getQr(
        sender.tab, message.info.left, message.info.top, message.info.width,
        message.info.height, message.info.windowWidth);
  } else if (message.action === 'cachePassphrase') {
    cachedPassphrase = message.value;
  } else if (message.action === 'passphrase') {
    sendResponse(cachedPassphrase);
  } else if (['dropbox', 'drive'].indexOf(message.action) > -1) {
    getBackupToken(message.action);
  } else if (message.action === 'lock') {
    cachedPassphrase = '';
  }
});

let contentTab: chrome.tabs.Tab;

function getQr(
    tab: chrome.tabs.Tab, left: number, top: number, width: number,
    height: number, windowWidth: number) {
  chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, (dataUrl) => {
    contentTab = tab;
    const qr = new Image();
    qr.src = dataUrl;
    qr.onload = () => {
      const devicePixelRatio = qr.width / windowWidth;
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = width * devicePixelRatio;
      captureCanvas.height = height * devicePixelRatio;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(
          qr, left * devicePixelRatio, top * devicePixelRatio,
          width * devicePixelRatio, height * devicePixelRatio, 0, 0,
          width * devicePixelRatio, height * devicePixelRatio);
      const url = captureCanvas.toDataURL();
      qrcode.callback = (text) => {
        getTotp(text);
      };
      qrcode.decode(url);
    };
  });
}

async function getTotp(text: string) {
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
      let period: number|undefined = undefined;

      try {
        label = decodeURIComponent(label);
      } catch (error) {
        console.error(error);
      }
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
          try {
            issuer = decodeURIComponent(parameter[1]);
          } catch {
            issuer = parameter[1];
          }
        } else if (parameter[0].toLowerCase() === 'counter') {
          let counter = Number(parameter[1]);
          counter = (isNaN(counter) || counter < 0) ? 0 : counter;
        } else if (parameter[0].toLowerCase() === 'period') {
          period = Number(parameter[1]);
          period = (isNaN(period) || period < 0 || period > 60 ||
                    60 % period !== 0) ?
              undefined :
              period;
        }
      });

      if (!secret) {
        chrome.tabs.sendMessage(id, {action: 'errorqr'});
      } else if (
          !/^[0-9a-f]+$/i.test(secret) && !/^[2-7a-z]+=*$/i.test(secret)) {
        chrome.tabs.sendMessage(id, {action: 'secretqr', secret});
      } else {
        const encryption = new Encryption(cachedPassphrase);
        const hash = CryptoJS.MD5(secret).toString();
        if (!/^[2-7a-z]+=*$/i.test(secret) && /^[0-9a-f]+$/i.test(secret) &&
            type === 'totp') {
          type = 'hex';
        } else if (
            !/^[2-7a-z]+=*$/i.test(secret) && /^[0-9a-f]+$/i.test(secret) &&
            type === 'hotp') {
          type = 'hhex';
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
        if (period) {
          entryData[hash].period = period;
        }
        await EntryStorage.import(encryption, entryData);
        chrome.tabs.sendMessage(id, {action: 'added', account});
      }
    }
  }
  return;
}

function getBackupToken(service: string) {
  if (navigator.userAgent.indexOf('Chrome') !== -1 && service === 'drive') {
    chrome.identity.getAuthToken(
        {
          'interactive': true,
          'scopes': ['https://www.googleapis.com/auth/drive.file']
        },
        (value) => {
          localStorage.driveToken = value;
          chrome.runtime.sendMessage({action: 'drivetoken', value});
          return true;
        });
  } else {
    let authUrl = '';
    if (service === 'dropbox') {
      authUrl =
          'https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=' +
          getCredentials().dropbox.client_id + '&redirect_uri=' +
          encodeURIComponent(chrome.identity.getRedirectURL());
    } else if (service === 'drive') {
      authUrl =
          'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&client_id=' +
          getCredentials().drive.client_id +
          '&scope=https%3A//www.googleapis.com/auth/drive.file&prompt=consent&redirect_uri=' +
          encodeURIComponent('https://authenticator.cc/oauth');
    }
    chrome.identity.launchWebAuthFlow(
        {url: authUrl, interactive: true}, async (url) => {
          if (!url) {
            return;
          }
          let hashMatches = url.split('#');
          if (service === 'drive') {
            hashMatches = url.slice(0, -1).split('?');
          }
          if (hashMatches.length < 2) {
            return;
          }

          const hash = hashMatches[1];

          const resData = hash.split('&');
          for (let i = 0; i < resData.length; i++) {
            const kv = resData[i];
            if (/^(.*?)=(.*?)$/.test(kv)) {
              const kvMatches = kv.match(/^(.*?)=(.*?)$/);
              if (!kvMatches) {
                continue;
              }
              const key = kvMatches[1];
              const value = kvMatches[2];
              if (key === 'access_token') {
                if (service === 'dropbox') {
                  localStorage.dropboxToken = value;
                  chrome.runtime.sendMessage({action: 'dropboxtoken', value});
                  return;
                }
              } else if (key === 'code') {
                if (service === 'drive') {
                  const xhr = new XMLHttpRequest();
                  // Need to trade code we got from launchWebAuthFlow for a
                  // token & refresh token
                  await new Promise(
                      (resolve: (value: boolean) => void,
                       reject: (reason: Error) => void) => {
                        xhr.open(
                            'POST',
                            'https://www.googleapis.com/oauth2/v4/token?client_id=' +
                                getCredentials().drive.client_id +
                                '&client_secret=' +
                                getCredentials().drive.client_secret +
                                '&code=' + value +
                                '&redirect_uri=https://authenticator.cc/oauth&grant_type=authorization_code');
                        xhr.setRequestHeader('Accept', 'application/json');
                        xhr.setRequestHeader(
                            'Content-Type',
                            'application/x-www-form-urlencoded');
                        xhr.onreadystatechange = () => {
                          if (xhr.readyState === 4) {
                            try {
                              const res = JSON.parse(xhr.responseText);
                              if (res.error) {
                                console.error(res.error_description);
                                resolve(false);
                              } else {
                                localStorage.driveToken = res.access_token;
                                localStorage.driveRefreshToken =
                                    res.refresh_token;
                                resolve(true);
                              }
                            } catch (error) {
                              console.error(error);
                              reject(error);
                            }
                          }
                          return;
                        };
                        xhr.send();
                      });
                  chrome.runtime.sendMessage({action: 'drivetoken', value});
                }
              }
            }
          }
          return;
        });
  }
}

// Show issue page after first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') {
    return;
  }

  let url: string|null = null;

  if (navigator.userAgent.indexOf('Chrome') !== -1) {
    url =
        'https://github.com/Authenticator-Extension/Authenticator/wiki/Chrome-Issues';
  } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
    url =
        'https://github.com/Authenticator-Extension/Authenticator/wiki/Firefox-Issues';
  } else if (navigator.userAgent.indexOf('Edge') !== -1) {
    url =
        'https://github.com/Authenticator-Extension/Authenticator/wiki/Edge-Issues';
  }

  if (url) {
    window.open(url, '_blank');
  }
});
