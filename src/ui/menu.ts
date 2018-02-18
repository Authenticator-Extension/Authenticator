/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
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

async function menu(_ui: UI) {
  const version = getVersion();
  const zoom = Number(localStorage.zoom) || 100;
  resize(zoom);

  const ui: UIConfig = {
    data: {version, zoom},
    methods: {
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
                _ui.instance.message = _ui.instance.i18n[message];
              }
              return;
            });
        return;
      }
    }
  };

  _ui.update(ui);
}