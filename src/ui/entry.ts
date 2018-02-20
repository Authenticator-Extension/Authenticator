/* tslint:disable:no-reference */
/// <reference path="../../node_modules/@types/crypto-js/index.d.ts" />
/// <reference path="../models/encryption.ts" />
/// <reference path="../models/interface.ts" />
/// <reference path="../models/storage.ts" />
/// <reference path="./ui.ts" />

async function getEntries(encryption: Encryption) {
  const optEntries: OTPEntry[] = await EntryStorage.get(encryption);
  return optEntries;
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

function getBackupFile(entryData: {[hash: string]: OTPStorage}) {
  let json = JSON.stringify(entryData, null, 2);
  // for windows notepad
  json = json.replace(/\n/g, '\r\n');
  const base64Data = btoa(json);
  return `data:application/octet-stream;base64,${base64Data}`;
}

async function getCurrentHostname() {
  return new Promise(
      (resolve: (value: string|null) => void,
       reject: (reason: Error) => void) => {
        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
          const tab = tabs[0];
          if (!tab || !tab.url) {
            return resolve(null);
          }
          const urlParser = document.createElement('a');
          urlParser.href = tab.url;
          const hostname = urlParser.hostname;
          return resolve(hostname);
        });
      });
}

function hasMatchedEntry(currentHost: string, entries: OTPEntry[]) {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].issuer.indexOf(currentHost) !== -1) {
      return true;
    }
  }
  return false;
}

async function entry(_ui: UI) {
  const cookie = document.cookie;
  const cookieMatch = cookie ? document.cookie.split('passphrase=') : null;
  const cachedPassphrase =
      cookieMatch && cookieMatch.length > 1 ? cookieMatch[1] : null;
  const cachedPassphraseLocalStorage = localStorage.encodedPhrase ?
      CryptoJS.AES.decrypt(localStorage.encodedPhrase, '')
          .toString(CryptoJS.enc.Utf8) :
      '';
  const encryption: Encryption =
      new Encryption(cachedPassphrase || cachedPassphraseLocalStorage || '');
  const shouldShowPassphrase =
      (cachedPassphrase || cachedPassphraseLocalStorage) ?
      false :
      await EntryStorage.hasEncryptedEntry();
  const exportData =
      shouldShowPassphrase ? {} : await EntryStorage.getExport(encryption);
  const entries = shouldShowPassphrase ? [] : await getEntries(encryption);
  const exportFile = getBackupFile(exportData);
  const currentHost = await getCurrentHostname();
  const shouldFilter =
      currentHost ? hasMatchedEntry(currentHost, entries) : false;

  const ui: UIConfig = {
    data: {
      entries,
      encryption,
      OTPType,
      shouldShowPassphrase,
      exportData: JSON.stringify(exportData, null, 2),
      exportFile,
      sector: '',
      notification: '',
      notificationTimeout: 0,
      filter: true,
      currentHost,
      shouldFilter
    },
    methods: {
      updateCode: async () => {
        return await updateCode(_ui.instance);
      },
      noCopy: (code: string) => {
        return code === 'Encrypted' || code === 'Invalid' ||
            code.startsWith('&bull;');
      },
      updateStorage: async () => {
        await EntryStorage.set(_ui.instance.encryption, _ui.instance.entries);
        return;
      },
      showBulls: (code: string) => {
        if (code.startsWith('&bull;')) {
          return code;
        }
        return new Array(code.length).fill('&bull;').join('');
      },
      importEntries: async () => {
        await EntryStorage.import(
            _ui.instance.encryption, JSON.parse(_ui.instance.exportData));
        await _ui.instance.updateEntries();
        _ui.instance.message = _ui.instance.i18n.updateSuccess;
        return;
      },
      updateEntries: async () => {
        const exportData =
            await EntryStorage.getExport(_ui.instance.encryption);
        _ui.instance.exportData = JSON.stringify(exportData, null, 2);
        _ui.instance.entries = await getEntries(_ui.instance.encryption);
        _ui.instance.exportFile = getBackupFile(exportData);
        await _ui.instance.updateCode();
        return;
      },
      importFile: (event: Event, closeWindow: boolean) => {
        const target = event.target as HTMLInputElement;
        if (!target || !target.files) {
          return;
        }
        if (target.files[0]) {
          const reader = new FileReader();
          reader.onload = async () => {
            const importData = JSON.parse(reader.result);
            await EntryStorage.import(_ui.instance.encryption, importData);
            await _ui.instance.updateEntries();
            _ui.instance.message = _ui.instance.i18n.updateSuccess;
            if (closeWindow) {
              window.close();
            }
          };
          reader.readAsText(target.files[0]);
        } else {
          _ui.instance.message = _ui.instance.i18n.updateFailure;
          if (closeWindow) {
            window.alert(_ui.instance.i18n.updateFailure);
            window.close();
          }
        }
        return;
      },
      removeEntry: async (entry: OTPEntry) => {
        if (await _ui.instance.confirm(_ui.instance.i18n.confirm_delete)) {
          await entry.delete();
          await _ui.instance.updateEntries();
        }
        return;
      },
      editEntry: () => {
        _ui.instance.class.edit = !_ui.instance.class.edit;
        const codes = document.getElementById('codes');
        if (codes) {
          // wait vue apply changes to dom
          setTimeout(() => {
            codes.scrollTop = _ui.instance.class.edit ? codes.scrollHeight : 0;
          }, 0);
        }
        return;
      },
      nextCode: async (entry: OTPEntry) => {
        if (_ui.instance.class.hotpDiabled) {
          return;
        }
        _ui.instance.class.hotpDiabled = true;
        await entry.next(_ui.instance.encryption);
        setTimeout(() => {
          _ui.instance.class.hotpDiabled = false;
        }, 3000);
        return;
      },
      copyCode: (entry: OTPEntry) => {
        if (_ui.instance.class.edit || entry.code === 'Invalid' ||
            entry.code.startsWith('&bull;')) {
          return;
        }

        if (entry.code === 'Encrypted') {
          _ui.instance.showInfo('passphrase');
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
                _ui.instance.notification = _ui.instance.i18n.copied;
                clearTimeout(_ui.instance.notificationTimeout);
                _ui.instance.class.notificationFadein = true;
                _ui.instance.class.notificationFadeout = false;
                _ui.instance.notificationTimeout = setTimeout(() => {
                  _ui.instance.class.notificationFadein = false;
                  _ui.instance.class.notificationFadeout = true;
                  setTimeout(() => {
                    _ui.instance.class.notificationFadeout = false;
                  }, 200);
                }, 1000);
              }
            });
        return;
      },
    }
  };

  _ui.update(ui);
}
