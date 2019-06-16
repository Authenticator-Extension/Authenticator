import { EntryStorage } from '../models/storage';
import { Encryption } from '../models/encryption';
import * as CryptoJS from 'crypto-js';

export enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex,
  hhex,
}

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
    const unsupportedAccounts = await this.hasUnsupportedAccounts();
    const exportFile = this.getBackupFile(exportData);
    const exportEncryptedFile = this.getBackupFile(exportEncData);
    const exportOneLineOtpAuthFile = this.getOneLineOtpBackupFile(exportData);
    const siteName = await this.getSiteName();
    const shouldFilter = this.hasMatchedEntry(siteName, entries);
    const showSearch = false;

    return {
      state: {
        entries,
        encryption,
        OTPType,
        shouldShowPassphrase,
        exportData: JSON.stringify(exportData, null, 2),
        exportEncData: JSON.stringify(exportEncData, null, 2),
        exportFile,
        exportEncryptedFile,
        exportOneLineOtpAuthFile,
        getFilePassphrase: false,
        sector: '',
        sectorStart: false,
        sectorOffset: 0,
        second: 0,
        notification: '',
        notificationTimeout: 0,
        filter: true,
        shouldFilter,
        showSearch,
        importType: 'import_file',
        importCode: '',
        importEncrypted: false,
        importPassphrase: '',
        importFilePassphrase: '',
        unsupportedAccounts,
        searchText: '',
        newAccount: {
          show: false,
          account: '',
          secret: '',
          type: OTPType.totp,
        },
        newPassphrase: { phrase: '', confirm: '' },
      },
      mutations: {},
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

  private hasMatchedEntry(
    siteName: Array<string | null>,
    entries: IOTPEntry[]
  ) {
    if (siteName.length < 2) {
      return false;
    }

    for (let i = 0; i < entries.length; i++) {
      if (this.isMatchedEntry(siteName, entries[i])) {
        return true;
      }
    }
    return false;
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
