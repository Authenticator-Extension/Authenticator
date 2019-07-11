import * as CryptoJS from "crypto-js";

import { Encryption } from "./encryption";
import { OTPEntry, OTPType } from "./otp";

export class BrowserStorage {
  private static async getStorageLocation() {
    const managedLocation = await ManagedStorage.get("storageArea");
    if (managedLocation === "sync" || managedLocation === "local") {
      return new Promise(resolve => {
        if (localStorage.storageLocation !== managedLocation) {
          localStorage.storageLocation = managedLocation;
        }
        resolve(managedLocation);
        return;
      });
    } else if (
      localStorage.storageLocation !== "sync" &&
      localStorage.storageLocation !== "local"
    ) {
      return new Promise((resolve, reject) => {
        let amountSync: number;
        let amountLocal: number;
        chrome.storage.local.get(local => {
          amountLocal = Object.keys(local).length;
          try {
            chrome.storage.sync.get(sync => {
              amountSync = Object.keys(sync).length;
              // If storage location can't be found try to auto-detect storage
              // location
              if (amountLocal > amountSync && amountSync === 0) {
                localStorage.storageLocation = "local";
              } else if (amountLocal < amountSync && amountLocal === 0) {
                localStorage.storageLocation = "sync";
              } else {
                // Use default
                localStorage.storageLocation = "sync";
              }
              resolve(localStorage.storageLocation);
              return;
            });
          } catch (error) {
            reject(error);
            return;
          }
        });
      });
    } else {
      return new Promise(resolve => {
        resolve(localStorage.storageLocation);
        return;
      });
    }
  }

  /* tslint:disable-next-line:no-any */
  static async get(callback: (items: { [key: string]: any }) => void) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === "local") {
      chrome.storage.local.get(callback);
    } else if (storageLocation === "sync") {
      chrome.storage.sync.get(callback);
    }
    return;
  }

  static async set(data: object, callback?: (() => void) | undefined) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === "local") {
      chrome.storage.local.set(data, callback);
    } else if (storageLocation === "sync") {
      chrome.storage.sync.set(data, callback);
    }
    return;
  }

  static async remove(
    data: string | string[],
    callback?: (() => void) | undefined
  ) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === "local") {
      chrome.storage.local.remove(data, callback);
    } else if (storageLocation === "sync") {
      chrome.storage.sync.remove(data, callback);
    }
    return;
  }
}

export class EntryStorage {
  private static getOTPStorageFromEntry(
    encryption: Encryption,
    entry: OTPEntry
  ): OTPStorage {
    const storageItem: OTPStorage = {
      account: entry.account,
      encrypted: encryption.getEncryptionStatus(),
      hash: entry.hash,
      index: entry.index,
      issuer: entry.issuer,
      type: OTPType[entry.type],
      counter: entry.counter, // TODO: Make this optional for non HOTP accounts
      secret: encryption.getEncryptedSecret(entry)
    };

    if (entry.period && entry.period !== 30) {
      storageItem.period = entry.period;
    }

    return storageItem;
  }

  private static ensureUniqueIndex(_data: { [hash: string]: OTPStorage }) {
    const tempEntryArray: OTPStorage[] = [];

    for (const hash of Object.keys(_data)) {
      if (!this.isValidEntry(_data, hash)) {
        continue;
      }
      tempEntryArray.push(_data[hash]);
    }

    tempEntryArray.sort((a, b) => {
      return a.index - b.index;
    });

    const newData: { [hash: string]: OTPStorage } = {};
    for (let i = 0; i < tempEntryArray.length; i++) {
      tempEntryArray[i].index = i;
      newData[tempEntryArray[i].hash] = tempEntryArray[i];
    }

    return newData;
  }

  /* tslint:disable-next-line:no-any */
  private static isOTPStorage(entry: any) {
    if (!entry || !entry.hasOwnProperty("secret")) {
      return false;
    }

    return true;
  }

  private static isValidEntry(
    _data: { [hash: string]: OTPStorage },
    hash: string
  ) {
    if (typeof _data[hash] !== "object") {
      console.log('Key "' + hash + '" is not an object');
      return false;
    } else {
      if (!this.isOTPStorage(_data[hash])) {
        console.log('Key "' + hash + '" is not OTPStorage');
        return false;
      }
      return true;
    }
  }

  static hasEncryptedEntry() {
    return new Promise(
      (resolve: (value: boolean) => void, reject: (reason: Error) => void) => {
        BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
          for (const hash of Object.keys(_data)) {
            if (!this.isValidEntry(_data, hash)) {
              continue;
            }
            if (_data[hash].encrypted) {
              return resolve(true);
            }
          }
          return resolve(false);
        });
        return;
      }
    );
  }

  static getExport(encryption: Encryption, encrypted?: boolean) {
    return new Promise(
      (
        resolve: (value: { [hash: string]: OTPStorage }) => void,
        reject: (reason: Error) => void
      ) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            for (const hash of Object.keys(_data)) {
              if (!this.isValidEntry(_data, hash)) {
                delete _data[hash];
                continue;
              }
              if (!encrypted) {
                // decrypt the data to export
                if (_data[hash].encrypted) {
                  const decryptedSecret = encryption.getDecryptedSecret(
                    _data[hash]
                  );
                  if (
                    decryptedSecret !== _data[hash].secret &&
                    decryptedSecret !== null
                  ) {
                    _data[hash].secret = decryptedSecret;
                    _data[hash].encrypted = false;
                  }
                }
                // we need correct hash
                if (hash !== _data[hash].hash) {
                  _data[_data[hash].hash] = _data[hash];
                  delete _data[hash];
                }
              }
            }
            return resolve(_data);
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }

  static import(encryption: Encryption, data: { [hash: string]: OTPStorage }) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            for (const hash of Object.keys(data)) {
              // never trust data import from user
              // we do not support encrypted data import any longer
              if (!data[hash].secret || data[hash].encrypted) {
                // we need give a failed warning
                continue;
              }

              data[hash].hash = data[hash].hash || hash;
              data[hash].account = data[hash].account || "";
              data[hash].encrypted = encryption.getEncryptionStatus();
              data[hash].index = data[hash].index || 0;
              data[hash].issuer = data[hash].issuer || "";
              data[hash].type = data[hash].type || OTPType[OTPType.totp];
              data[hash].counter = data[hash].counter || 0;
              const period = data[hash].period;
              if (
                data[hash].type !== OTPType[OTPType.totp] ||
                (period && (isNaN(period) || period <= 0))
              ) {
                delete data[hash].period;
              }

              if (/^(blz\-|bliz\-)/.test(data[hash].secret)) {
                const secretMatches = data[hash].secret.match(
                  /^(blz\-|bliz\-)(.*)/
                );
                if (secretMatches && secretMatches.length >= 3) {
                  data[hash].secret = secretMatches[2];
                  data[hash].type = OTPType[OTPType.battle];
                }
              }

              if (/^stm\-/.test(data[hash].secret)) {
                const secretMatches = data[hash].secret.match(/^stm\-(.*)/);
                if (secretMatches && secretMatches.length >= 2) {
                  data[hash].secret = secretMatches[1];
                  data[hash].type = OTPType[OTPType.steam];
                }
              }

              if (
                !/^[a-z2-7]+=*$/i.test(data[hash].secret) &&
                /^[0-9a-f]+$/i.test(data[hash].secret) &&
                data[hash].type === OTPType[OTPType.totp]
              ) {
                data[hash].type = OTPType[OTPType.hex];
              }

              if (
                !/^[a-z2-7]+=*$/i.test(data[hash].secret) &&
                /^[0-9a-f]+$/i.test(data[hash].secret) &&
                data[hash].type === OTPType[OTPType.hotp]
              ) {
                data[hash].type = OTPType[OTPType.hhex];
              }

              const _hash = CryptoJS.MD5(data[hash].secret).toString();
              // not a valid hash
              if (!/^[0-9a-f]{32}$/.test(hash)) {
                data[_hash] = data[hash];
                data[_hash].hash = _hash;
                delete data[hash];
              }

              if (data[_hash]) {
                data[_hash].secret = encryption.getEncryptedString(
                  data[_hash].secret
                );
                _data[_hash] = data[_hash];
              } else {
                data[hash].secret = encryption.getEncryptedString(
                  data[hash].secret
                );
                _data[hash] = data[hash];
              }
            }
            _data = this.ensureUniqueIndex(_data);
            BrowserStorage.set(_data, resolve);
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }

  static add(encryption: Encryption, entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            if (_data.hasOwnProperty(entry.hash)) {
              throw new Error("The specific entry has already existed.");
            }
            const storageItem = this.getOTPStorageFromEntry(encryption, entry);
            _data[entry.hash] = storageItem;
            _data = this.ensureUniqueIndex(_data);
            BrowserStorage.set(_data, resolve);
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }

  static update(encryption: Encryption, entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            if (!_data.hasOwnProperty(entry.hash)) {
              throw new Error("Entry to change does not exist.");
            }
            const storageItem = this.getOTPStorageFromEntry(encryption, entry);
            _data[entry.hash] = storageItem;
            _data = this.ensureUniqueIndex(_data);
            BrowserStorage.set(_data, resolve);
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }

  static set(encryption: Encryption, entries: OTPEntry[]) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            entries.forEach(entry => {
              const storageItem = this.getOTPStorageFromEntry(
                encryption,
                entry
              );
              _data[entry.hash] = storageItem;
            });
            _data = this.ensureUniqueIndex(_data);
            BrowserStorage.set(_data, resolve);
          });
          return;
        } catch (error) {
          reject(error);
        }
      }
    );
  }

  static get(encryption: Encryption) {
    return new Promise(
      (
        resolve: (value: OTPEntry[]) => void,
        reject: (reason: Error) => void
      ) => {
        try {
          BrowserStorage.get(async (_data: { [hash: string]: OTPStorage }) => {
            const data: OTPEntry[] = [];
            for (const hash of Object.keys(_data)) {
              if (!this.isValidEntry(_data, hash)) {
                continue;
              }
              const entryData = _data[hash];
              let needMigrate = false;

              if (!entryData.hash) {
                entryData.hash = hash;
                needMigrate = true;
              }

              if (!entryData.type) {
                entryData.type = OTPType[OTPType.totp];
                needMigrate = true;
              }

              let type: OTPType;
              switch (entryData.type) {
                case "totp":
                case "hotp":
                case "battle":
                case "steam":
                case "hex":
                case "hhex":
                  type = OTPType[entryData.type];
                  break;
                default:
                  // we need correct the type here
                  // and save it
                  type = OTPType.totp;
                  entryData.type = OTPType[OTPType.totp];
                  needMigrate = true;
              }

              let period = 30;
              if (
                entryData.type === OTPType[OTPType.totp] &&
                entryData.period &&
                entryData.period > 0
              ) {
                period = entryData.period;
              }

              const entry = new OTPEntry({
                account: entryData.account,
                encrypted: entryData.encrypted,
                hash: entryData.hash,
                index: entryData.index,
                issuer: entryData.issuer,
                secret: entryData.secret,
                type,
                counter: entryData.counter,
                period
              });
              entry.applyEncryption(encryption);
              data.push(entry);

              if (entry.secret !== null && !/^[0-9a-f]{32}$/.test(hash)) {
                const _hash = CryptoJS.MD5(entry.secret).toString();
                if (hash !== _hash) {
                  console.warn("Invalid hash:", entry);
                }
              }
            }

            data.sort((a, b) => {
              return a.index - b.index;
            });

            for (let i = 0; i < data.length; i++) {
              if (data[i].index !== i) {
                const exportData = await this.getExport(encryption);
                await this.import(encryption, exportData);
                break;
              }
            }

            return resolve(data);
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }

  static remove(hash: string) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        return BrowserStorage.remove(hash, resolve);
      }
    );
  }

  static delete(entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            if (_data.hasOwnProperty(entry.hash)) {
              delete _data[entry.hash];
            }
            _data = this.ensureUniqueIndex(_data);
            BrowserStorage.remove(entry.hash, () => {
              BrowserStorage.set(_data, resolve);
            });
            return;
          });
          return;
        } catch (error) {
          return reject(error);
        }
      }
    );
  }
}

export class ManagedStorage {
  static get(key: string) {
    return new Promise((resolve: (result: boolean | string) => void) => {
      chrome.storage.managed.get(data => {
        if (chrome.runtime.lastError) {
          resolve(false);
        }
        if (data) {
          if (data[key]) {
            resolve(data[key]);
          }
        }
        resolve(false);
      });
    });
  }
}
