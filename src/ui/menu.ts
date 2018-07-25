/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="../models/dropbox.ts" />
/// <reference path="./ui.ts" />

function getVersion() {
  return chrome.runtime.getManifest().version;
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

function resize(zoom: number) {
  if (zoom !== 100) {
    document.body.style.marginBottom = 480 * (zoom / 100 - 1) + 'px';
    document.body.style.marginRight = 320 * (zoom / 100 - 1) + 'px';
    document.body.style.transform = 'scale(' + (zoom / 100) + ')';
  }
}

function openHelp() {
  let url =
      'https://github.com/Authenticator-Extension/Authenticator/wiki/Chrome-Issues';

  if (navigator.userAgent.indexOf('Chrome') !== -1) {
    url =
        'https://github.com/Authenticator-Extension/Authenticator/wiki/Chrome-Issues';
  } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
    url =
        'https://github.com/Authenticator-Extension/Authenticator/wiki/Firefox-Issues';
  }

  window.open(url, '_blank');
}

async function menu(_ui: UI) {
  const version = getVersion();
  const zoom = Number(localStorage.zoom) || 100;
  resize(zoom);
  let useAutofill = (localStorage.autofill === 'true');

  const ui: UIConfig = {
    data: {version, zoom, useAutofill},
    methods: {
      openLink: (url: string) => {
        window.open(url, '_blank');
        return;
      },
      showMenu: () => {
        _ui.instance.class.slidein = true;
        _ui.instance.class.slideout = false;
        return;
      },
      closeMenu: () => {
        _ui.instance.class.slidein = false;
        _ui.instance.class.slideout = true;
        setTimeout(() => {
          _ui.instance.class.slideout = false;
        }, 200);
        return;
      },
      openHelp: () => {
        openHelp();
        return;
      },
      isChrome: () => {
        if (navigator.userAgent.indexOf('Chrome') !== -1) {
          return true;
        } else {
          return false;
        }
      },
      saveAutofill: () => {
        localStorage.autofill = _ui.instance.useAutofill;
        useAutofill =
            (localStorage.autofill === 'true') ? true : false || false;
        return;
      },
      saveZoom: () => {
        localStorage.zoom = _ui.instance.zoom;
        resize(_ui.instance.zoom);
        return;
      },
      syncClock: async () => {
        chrome.permissions.request(
            {origins: ['https://www.google.com/']}, async (granted) => {
              if (granted) {
                const message = await syncTimeWithGoogle();
                _ui.instance.alert(_ui.instance.i18n[message]);
              }
              return;
            });
        return;
      },
      popOut: () => {
        let windowType;
        if (navigator.userAgent.indexOf('Firefox') !== -1) {
          windowType = 'detached_panel';
        } else {
          windowType = 'panel';
        }
        chrome.windows.create({
          url: chrome.extension.getURL('view/popup.html?popup=true'),
          type: windowType,
          height: window.innerHeight,
          width: window.innerWidth
        });
      },
      isPopup: () => {
        const params =
            new URLSearchParams(document.location.search.substring(1));
        return params.get('popup');
      },
      fixPopupSize: () => {
        const zoom = Number(localStorage.zoom) / 100 || 1;
        const correctHeight = 480 * zoom;
        const correctWidth = 320 * zoom;
        if (window.innerHeight !== correctHeight ||
            window.innerWidth !== correctWidth) {
          chrome.windows.getCurrent((currentWindow) => {
            chrome.windows.update(
                currentWindow.id, {height: correctHeight, width: correctWidth});
          });
        }
      },
      dropboxUpload: async () => {
        const dbox = new Dropbox();
        const response = await dbox.upload(_ui.instance.encryption);
        if (response === true) {
          _ui.instance.alert(_ui.instance.i18n.updateSuccess);
        } else {
          _ui.instance.alert(_ui.instance.i18n.updateFailure);
        }
      }
    }
  };

  _ui.update(ui);
}
