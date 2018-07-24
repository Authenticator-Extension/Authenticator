/* tslint:disable:no-reference */
/// <reference path="../models/encryption.ts" />
/// <reference path="../models/interface.ts" />
/// <reference path="../models/storage.ts" />
/// <reference path="./ui.ts" />
/// <reference path="./add-account.ts" />

async function getEntries(encryption: Encryption) {
  const optEntries: OTPEntry[] = await EntryStorage.get(encryption);
  return optEntries;
}

/* tslint:disable-next-line:no-any */
async function updateCode(app: any) {
  let second = new Date().getSeconds();
  if (localStorage.offset) {
    // prevent second from negative
    second += Number(localStorage.offset) + 30;
  }
  second = second % 30;
  if (!app.sectorStart &&
      (!app.shouldShowPassphrase || app.entries.length > 0)) {
    console.log('updated');
    app.sectorStart = true;
    app.sectorOffset = -second;
  }

  if (second > 25) {
    app.class.timeout = true;
  } else {
    app.class.timeout = false;
  }
  if (second < 1) {
    const entries = app.entries as OTP[];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].type !== OTPType.hotp &&
          entries[i].type !== OTPType.hhex) {
        entries[i].generate();
      }
    }
  }
}

function getBackupFile(entryData: {[hash: string]: OTPStorage}) {
  let json = JSON.stringify(entryData, null, 2);
  // for windows notepad
  json = json.replace(/\n/g, '\r\n');
  const base64Data =
      CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(json));
  return `data:application/octet-stream;base64,${base64Data}`;
}

async function getSiteName() {
  return new Promise(
      (resolve: (value: Array<string|null>) => void,
       reject: (reason: Error) => void) => {
        chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
          const tab = tabs[0];
          if (!tab) {
            return resolve([null, null]);
          }

          const title = tab.title ?
              tab.title.replace(/[^a-z0-9]/ig, '').toLowerCase() :
              null;

          if (!tab.url) {
            return resolve([title, null]);
          }

          const urlParser = document.createElement('a');
          urlParser.href = tab.url;
          const hostname = urlParser.hostname.toLowerCase();

          // try to parse name from hostname
          // i.e. hostname is www.example.com
          // name should be example
          let nameFromDomain = '';

          // ip address
          if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            nameFromDomain = hostname;
          }

          // local network
          if (hostname.indexOf('.') === -1) {
            nameFromDomain = hostname;
          }

          const hostLevelUnits = hostname.split('.');

          if (hostLevelUnits.length === 2) {
            nameFromDomain = hostLevelUnits[0];
          }

          // www.example.com
          // example.com.cn
          if (hostLevelUnits.length > 2) {
            // example.com.cn
            if (['com', 'net', 'org', 'edu', 'gov', 'co'].indexOf(
                    hostLevelUnits[hostLevelUnits.length - 2]) !== -1) {
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 3];
            } else {  // www.example.com
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 2];
            }
          }

          nameFromDomain = nameFromDomain.replace(/-/g, '').toLowerCase();

          return resolve([title, nameFromDomain, hostname]);
        });
      });
}

function hasMatchedEntry(siteName: Array<string|null>, entries: OTPEntry[]) {
  if (siteName.length < 2) {
    return false;
  }

  for (let i = 0; i < entries.length; i++) {
    if (isMatchedEntry(siteName, entries[i])) {
      return true;
    }
  }
  return false;
}

function isMatchedEntry(siteName: Array<string|null>, entry: OTPEntry) {
  if (!entry.issuer) {
    return false;
  }

  const issuerHostMatches = entry.issuer.split('::');
  const issuer = issuerHostMatches[0].replace(/[^0-9a-z]/ig, '').toLowerCase();

  if (!issuer) {
    return false;
  }

  const siteTitle = siteName[0] || '';
  const siteNameFromHost = siteName[1] || '';
  const siteHost = siteName[2] || '';

  if (issuerHostMatches.length > 1) {
    if (siteHost && siteHost.indexOf(issuerHostMatches[1]) !== -1) {
      return true;
    }
  }
  // site title should be more detailed
  // so we use siteTitle.indexOf(issuer)
  if (siteTitle && siteTitle.indexOf(issuer) !== -1) {
    return true;
  }

  if (siteNameFromHost && issuer.indexOf(siteNameFromHost) !== -1) {
    return true;
  }

  return false;
}

async function getCachedPassphrase() {
  return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        const cookie = document.cookie;
        const cookieMatch =
            cookie ? document.cookie.match(/passphrase=([^;]*)/) : null;
        const cachedPassphrase =
            cookieMatch && cookieMatch.length > 1 ? cookieMatch[1] : null;
        const cachedPassphraseLocalStorage = localStorage.encodedPhrase ?
            CryptoJS.AES.decrypt(localStorage.encodedPhrase, '')
                .toString(CryptoJS.enc.Utf8) :
            '';
        if (cachedPassphrase || cachedPassphraseLocalStorage) {
          return resolve(cachedPassphrase || cachedPassphraseLocalStorage);
        }

        chrome.runtime.sendMessage(
            {action: 'passphrase'}, (passphrase: string) => {
              return resolve(passphrase);
            });
      });
}

async function entry(_ui: UI) {
  const cachedPassphrase = await getCachedPassphrase();
  const encryption: Encryption = new Encryption(cachedPassphrase);
  let shouldShowPassphrase =
      cachedPassphrase ? false : await EntryStorage.hasEncryptedEntry();
  const exportData =
      shouldShowPassphrase ? {} : await EntryStorage.getExport(encryption);
  const exportEncData = shouldShowPassphrase ?
      {} :
      await EntryStorage.getExport(encryption, true);
  const entries = shouldShowPassphrase ? [] : await getEntries(encryption);

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].code === 'Encrypted') {
      shouldShowPassphrase = true;
      break;
    }
  }

  const exportFile = getBackupFile(exportData);
  const exportEncryptedFile = getBackupFile(exportEncData);
  const siteName = await getSiteName();
  const shouldFilter = hasMatchedEntry(siteName, entries);
  const showSearch = false;

  const ui: UIConfig = {
    data: {
      entries,
      encryption,
      OTPType,
      shouldShowPassphrase,
      exportData: JSON.stringify(exportData, null, 2),
      exportEncData: JSON.stringify(exportEncData, null, 2),
      exportFile,
      exportEncryptedFile,
      getFilePassphrase: false,
      sector: '',
      sectorStart: false,
      sectorOffset: 0,
      notification: '',
      notificationTimeout: 0,
      filter: true,
      shouldFilter,
      showSearch,
      importType: 'import_file',
      importCode: '',
      importEncrypted: false,
      importPassphrase: '',
      importFilePassphrase: ''
    },
    methods: {
      isMatchedEntry: (entry: OTPEntry) => {
        return isMatchedEntry(siteName, entry);
      },
      searchListener: (e) => {
        if (e.keyCode === 191) {
          if (_ui.instance.info !== '') {
            return;
          }
          _ui.instance.filter = false;
          // It won't focus the texfield if vue unhides the div
          //_ui.instance.showSearch = true;
          const searchDiv = document.getElementById('search');
          const searchInput = document.getElementById('searchInput');
          if (!searchInput || !searchDiv) {
            return;
          }
          searchDiv.style.display = 'block';
          searchInput.focus();
        }
      },
      searchUpdate: () => {
        if (_ui.instance.filter) {
          _ui.instance.filter = false;
        }
        if (!_ui.instance.showSearch) {
          _ui.instance.showSearch = true;
        }
      },
      isSearchedEntry: (entry: OTPEntry) => {
        if (_ui.instance.searchText === '') {
          return true;
        }

        if (entry.issuer.toLowerCase().includes(
                _ui.instance.searchText.toLowerCase()) ||
            entry.account.toLowerCase().includes(
                _ui.instance.searchText.toLowerCase())) {
          return true;
        } else {
          return false;
        }
      },
      updateCode: async () => {
        return await updateCode(_ui.instance);
      },
      decryptBackupData:
          (backupData: {[hash: string]: OTPStorage},
           passphrase: string|null) => {
            const decryptedbackupData: {[hash: string]: OTPStorage} = {};
            for (const hash of Object.keys(backupData)) {
              if (typeof backupData[hash] !== 'object') {
                continue;
              }
              if (!backupData[hash].secret) {
                continue;
              }
              if (backupData[hash].encrypted && !passphrase) {
                continue;
              }
              if (backupData[hash].encrypted && passphrase) {
                try {
                  backupData[hash].secret =
                      CryptoJS.AES.decrypt(backupData[hash].secret, passphrase)
                          .toString(CryptoJS.enc.Utf8);
                  backupData[hash].encrypted = false;
                } catch (error) {
                  continue;
                }
              }
              // backupData[hash].secret may be empty after decrypt with wrong
              // passphrase
              if (!backupData[hash].secret) {
                continue;
              }
              decryptedbackupData[hash] = backupData[hash];
            }
            return decryptedbackupData;
          },
      importBackupCode: async () => {
        try {
          const exportData: {[hash: string]: OTPStorage} =
              JSON.parse(_ui.instance.importCode);
          const passphrase: string|null =
              _ui.instance.importEncrypted && _ui.instance.importPassphrase ?
              _ui.instance.importPassphrase :
              null;
          const decryptedbackupData: {[hash: string]: OTPStorage} =
              _ui.instance.decryptBackupData(exportData, passphrase);
          if (Object.keys(decryptedbackupData).length) {
            await EntryStorage.import(
                _ui.instance.encryption, decryptedbackupData);
            await _ui.instance.updateEntries();
            alert(_ui.instance.i18n.updateSuccess);
            window.close();
          } else {
            alert(_ui.instance.i18n.updateFailure);
          }
          return;
        } catch (error) {
          throw error;
        }
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
        _ui.instance.alert(_ui.instance.i18n.updateSuccess);
        return;
      },
      updateEntries: async () => {
        const exportData =
            await EntryStorage.getExport(_ui.instance.encryption);
        const exportEncData =
            await EntryStorage.getExport(_ui.instance.encryption, true);
        _ui.instance.exportData = JSON.stringify(exportData, null, 2);
        _ui.instance.entries = await getEntries(_ui.instance.encryption);
        _ui.instance.exportFile = getBackupFile(exportData);
        _ui.instance.exportEncryptedFile = getBackupFile(exportEncData);
        await _ui.instance.updateCode();
        return;
      },
      getOldPassphrase: async () => {
        _ui.instance.getFilePassphrase = true;
        while (true) {
          if (_ui.instance.readFilePassphrase) {
            if (_ui.instance.importFilePassphrase) {
              _ui.instance.readFilePassphrase = false;
              break;
            } else {
              _ui.instance.readFilePassphrase = false;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        return _ui.instance.importFilePassphrase as string;
      },
      importFile: (event: Event, closeWindow: boolean) => {
        const target = event.target as HTMLInputElement;
        if (!target || !target.files) {
          return;
        }
        if (target.files[0]) {
          const reader = new FileReader();
          let decryptedFileData: {[hash: string]: OTPStorage} = {};
          reader.onload = async () => {
            const importData: {[hash: string]: OTPStorage} =
                JSON.parse(reader.result);
            let encrypted = false;
            for (const hash in importData) {
              if (importData[hash].encrypted) {
                encrypted = true;
                try {
                  const oldPassphrase: string|null =
                      await _ui.instance.getOldPassphrase();
                  decryptedFileData =
                      _ui.instance.decryptBackupData(importData, oldPassphrase);
                  break;
                } catch {
                  break;
                }
              }
            }
            if (!encrypted) {
              decryptedFileData = importData;
            }
            if (Object.keys(decryptedFileData).length) {
              await EntryStorage.import(
                  _ui.instance.encryption, decryptedFileData);
              await _ui.instance.updateEntries();
              alert(_ui.instance.i18n.updateSuccess);
              if (closeWindow) {
                window.close();
              }
            } else {
              alert(_ui.instance.i18n.updateFailure);
              _ui.instance.getFilePassphrase = false;
              _ui.instance.importFilePassphrase = '';
            }
          };
          reader.readAsText(target.files[0]);
        } else {
          _ui.instance.alert(_ui.instance.i18n.updateFailure);
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
        if (_ui.instance.class.Diabled) {
          return;
        }
        _ui.instance.class.hotpDiabled = true;
        await entry.next(_ui.instance.encryption);
        setTimeout(() => {
          _ui.instance.class.hotpDiabled = false;
        }, 3000);
        return;
      },
      copyCode: async (entry: OTPEntry) => {
        if (_ui.instance.class.edit || entry.code === 'Invalid' ||
            entry.code.startsWith('&bull;')) {
          return;
        }

        if (entry.code === 'Encrypted') {
          _ui.instance.showInfo('passphrase');
          return;
        }

        chrome.permissions.request(
            {permissions: ['clipboardWrite']}, async (granted) => {
              if (granted) {
                const codeClipboard = document.getElementById(
                                          'codeClipboard') as HTMLInputElement;
                if (!codeClipboard) {
                  return;
                }

                if (_ui.instance.useAutofill) {
                  await insertContentScript();

                  chrome.tabs.query(
                      {active: true, lastFocusedWindow: true}, (tabs) => {
                        const tab = tabs[0];
                        if (!tab || !tab.id) {
                          return;
                        }

                        chrome.tabs.sendMessage(
                            tab.id, {action: 'pastecode', code: entry.code});
                      });
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
