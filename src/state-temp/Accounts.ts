import { EntryStorage } from '../models/storage';
import { Encryption } from '../models/encryption';
import * as CryptoJS from 'crypto-js';
import { OTPType } from '../models/otp';
import { ActionContext } from 'vuex';

export class Accounts implements IModule {
  async getModule() {
    const cachedPassphrase = await this.getCachedPassphrase();
    const encryption: Encryption = new Encryption(cachedPassphrase);
    let shouldShowPassphrase = cachedPassphrase
      ? false
      : await EntryStorage.hasEncryptedEntry();
    const exportData = shouldShowPassphrase
      ? {}
      : await EntryStorage.getExport(encryption);
    const exportEncData = shouldShowPassphrase
      ? {}
      : await EntryStorage.getExport(encryption, true);
    const entries = shouldShowPassphrase
      ? []
      : await this.getEntries(encryption);

    for (let i = 0; i < entries.length; i++) {
      if (entries[i].code === 'Encrypted') {
        shouldShowPassphrase = true;
        break;
      }
    }

    return {
      state: {
        entries,
        encryption,
        OTPType,
        shouldShowPassphrase,
        exportData: JSON.stringify(exportData, null, 2), // Move to module
        exportEncData: JSON.stringify(exportEncData, null, 2), // Move to module
        exportFile: this.getBackupFile(exportData), // Move to module
        exportEncryptedFile: this.getBackupFile(exportEncData), // Move to module
        exportOneLineOtpAuthFile: this.getOneLineOtpBackupFile(exportData), // Move to module
        getFilePassphrase: false, // Move to module
        sectorStart: false, // Should display timer circles?
        sectorOffset: 0, // Offset in seconds for animations
        second: 0, // Offset in seconds for math
        filter: true,
        siteName: await this.getSiteName(),
        showSearch: false,
        importType: 'import_file', // Move to module
        importCode: '', // Move to module
        importEncrypted: false, // Move to module
        importPassphrase: '', // Move to module
        importFilePassphrase: '', // Move to module
        unsupportedAccounts: await this.hasUnsupportedAccounts(),
        newPassphrase: { phrase: '', confirm: '' }, // Move to module
      },
      getters: {
        shouldFilter(
          state: AccountsState,
          getters: { matchedEntries: string[] }
        ) {
          return getters.matchedEntries.length;
        },
        matchedEntries: (state: AccountsState) => {
          return this.matchedEntries(state.siteName, state.entries);
        },
      },
      mutations: {
        stopFilter(state: AccountsState) {
          state.filter = false;
        },
        showSearch(state: AccountsState) {
          state.showSearch = true;
        },
        updateCodes(state: AccountsState) {
          let second = new Date().getSeconds();
          if (localStorage.offset) {
            // prevent second from negative
            second += Number(localStorage.offset) + 60;
          }

          second = second % 60;
          state.second = second;

          if (!state.sectorStart && state.entries.length > 0) {
            state.sectorStart = true;
            state.sectorOffset = -second;
          }

          // if (second > 25) {
          //   app.class.timeout = true;
          // } else {
          //   app.class.timeout = false;
          // }
          // if (second < 1) {
          //   const entries = app.entries as OTP[];
          //   for (let i = 0; i < entries.length; i++) {
          //     if (entries[i].type !== OTPType.hotp &&
          //         entries[i].type !== OTPType.hhex) {
          //       entries[i].generate();
          //     }
          //   }
          // }
          const entries = state.entries as IOTPEntry[];
          for (let i = 0; i < entries.length; i++) {
            if (
              entries[i].type !== OTPType.hotp &&
              entries[i].type !== OTPType.hhex
            ) {
              entries[i].generate();
            }
          }
        },
        loadCodes(state: AccountsState, newCodes: IOTPEntry[]) {
          state.entries = newCodes;
        },
      },
      actions: {
        applyPassphrase: async (
          state: ActionContext<AccountsState, {}>,
          password: string
        ) => {
          if (!password) {
            return;
          }

          state.state.encryption.updateEncryptionPassword(password);
          await state.dispatch('updateEntries');
          state.commit('style/hideInfo', null, { root: true });

          document.cookie = 'passphrase=' + password;
          chrome.runtime.sendMessage({
            action: 'cachePassphrase',
            value: password,
          });
          return;
        },
        updateEntries: async (state: ActionContext<AccountsState, {}>) => {
          state.commit(
            'loadCodes',
            await this.getEntries(state.state.encryption as Encryption)
          );
          state.commit('updateCodes');
          return;
        },
        clearFilter: async (state: ActionContext<AccountsState, {}>) => {
          state.commit('stopFilter');
          if (state.state.entries.length >= 10) {
            state.commit('showSearch');
          }
        },
      },
      namespaced: true,
    };
  }

  private async getSiteName() {
    return new Promise(
      (
        resolve: (value: Array<string | null>) => void,
        reject: (reason: Error) => void
      ) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
          const tab = tabs[0];
          if (!tab) {
            return resolve([null, null]);
          }

          const title = tab.title
            ? tab.title.replace(/[^a-z0-9]/gi, '').toLowerCase()
            : null;

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
            if (
              ['com', 'net', 'org', 'edu', 'gov', 'co'].indexOf(
                hostLevelUnits[hostLevelUnits.length - 2]
              ) !== -1
            ) {
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 3];
            } else {
              // www.example.com
              nameFromDomain = hostLevelUnits[hostLevelUnits.length - 2];
            }
          }

          nameFromDomain = nameFromDomain.replace(/-/g, '').toLowerCase();

          return resolve([title, nameFromDomain, hostname]);
        });
      }
    );
  }

  private getCachedPassphrase() {
    return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        const cookie = document.cookie;
        const cookieMatch = cookie
          ? document.cookie.match(/passphrase=([^;]*)/)
          : null;
        const cachedPassphrase =
          cookieMatch && cookieMatch.length > 1 ? cookieMatch[1] : null;
        const cachedPassphraseLocalStorage = localStorage.encodedPhrase
          ? CryptoJS.AES.decrypt(localStorage.encodedPhrase, '').toString(
              CryptoJS.enc.Utf8
            )
          : '';
        if (cachedPassphrase || cachedPassphraseLocalStorage) {
          return resolve(cachedPassphrase || cachedPassphraseLocalStorage);
        }

        chrome.runtime.sendMessage(
          { action: 'passphrase' },
          (passphrase: string) => {
            return resolve(passphrase);
          }
        );
      }
    );
  }

  private async getEntries(encryption: Encryption) {
    const otpEntries = await EntryStorage.get(encryption);
    return otpEntries;
  }

  private getBackupFile(entryData: { [hash: string]: OTPStorage }) {
    let json = JSON.stringify(entryData, null, 2);
    // for windows notepad
    json = json.replace(/\n/g, '\r\n');
    const base64Data = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(json)
    );
    return `data:application/octet-stream;base64,${base64Data}`;
  }

  private getOneLineOtpBackupFile(entryData: { [hash: string]: OTPStorage }) {
    const otpAuthLines: string[] = [];
    for (const hash of Object.keys(entryData)) {
      const otpStorage = entryData[hash];
      otpStorage.issuer = this.removeUnsafeData(otpStorage.issuer);
      otpStorage.account = this.removeUnsafeData(otpStorage.account);
      const label = otpStorage.issuer
        ? otpStorage.issuer + ':' + otpStorage.account
        : otpStorage.account;
      let type = '';
      if (otpStorage.type === 'totp' || otpStorage.type === 'hex') {
        type = 'totp';
      } else if (otpStorage.type === 'hotp' || otpStorage.type === 'hhex') {
        type = 'hotp';
      } else {
        continue;
      }

      const otpAuthLine =
        'otpauth://' +
        type +
        '/' +
        label +
        '?secret=' +
        otpStorage.secret +
        (otpStorage.issuer ? '&issuer=' + otpStorage.issuer : '') +
        (type === 'hotp' ? '&counter=' + otpStorage.counter : '') +
        (type === 'totp' && otpStorage.period
          ? '&period=' + otpStorage.period
          : '');

      otpAuthLines.push(otpAuthLine);
    }

    const base64Data = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(otpAuthLines.join('\r\n'))
    );
    return `data:application/octet-stream;base64,${base64Data}`;
  }

  private removeUnsafeData(data: string) {
    return encodeURIComponent(data.split('::')[0].replace(/:/g, ''));
  }

  private async hasUnsupportedAccounts() {
    const entries = await EntryStorage.getExport(new Encryption(''));
    for (const entry of Object.keys(entries)) {
      if (entries[entry].type === 'battle' || entries[entry].type === 'steam') {
        console.log(entries[entry]);
        return true;
      }
    }
    return false;
  }

  private matchedEntries(siteName: Array<string | null>, entries: IOTPEntry[]) {
    if (siteName.length < 2) {
      return false;
    }

    const matched = [];

    for (const entry of entries) {
      if (this.isMatchedEntry(siteName, entry)) {
        matched.push(entry.hash);
      }
    }

    return matched;
  }

  private isMatchedEntry(siteName: Array<string | null>, entry: IOTPEntry) {
    if (!entry.issuer) {
      return false;
    }

    const issuerHostMatches = entry.issuer.split('::');
    const issuer = issuerHostMatches[0]
      .replace(/[^0-9a-z]/gi, '')
      .toLowerCase();

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
}
