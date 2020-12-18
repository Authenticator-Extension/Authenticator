import { Encryption } from "./encryption";
import { OTPEntry, OTPType, OTPAlgorithm, CodeState } from "./otp";
import * as uuid from "uuid/v4";

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

  // TODO: promise this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async get(callback: (items: { [key: string]: any }) => void) {
    const storageLocation = await this.getStorageLocation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeKey = function(items: { [key: string]: any }): void {
      delete items.key;
      callback(items);
    };

    if (storageLocation === "local") {
      chrome.storage.local.get(removeKey);
    } else if (storageLocation === "sync") {
      chrome.storage.sync.get(removeKey);
    }
    return;
  }

  static getKey() {
    return new Promise(
      (resolve: (key: { enc: string; hash: string } | null) => void) => {
        this.getStorageLocation().then(storageLocation => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const callback = function(items: { [key: string]: any }): void {
            if (typeof items.key === "object") {
              resolve(items.key);
            } else {
              resolve(null);
            }
            return;
          };

          if (storageLocation === "local") {
            chrome.storage.local.get(callback);
          } else if (storageLocation === "sync") {
            chrome.storage.sync.get(callback);
          }
          return;
        });
      }
    );
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

  // Use for Chrome only.
  // https://github.com/Authenticator-Extension/Authenticator/issues/412
  static async clearLogs() {
    const storageLocation = await this.getStorageLocation();
    await new Promise((resolve: () => void) => {
      if (storageLocation === "local") {
        chrome.storage.local.get(data => {
          chrome.storage.local.clear(() => {
            chrome.storage.local.set(data, () => {
              resolve();
            });
          });
        });
      } else if (storageLocation === "sync") {
        chrome.storage.sync.get(data => {
          chrome.storage.sync.clear(() => {
            chrome.storage.sync.set(data, () => {
              resolve();
            });
          });
        });
      }
    });
    return;
  }
}

export class EntryStorage {
  private static getOTPStorageFromEntry(
    entry: OTPEntry,
    unencrypted?: boolean
  ): OTPStorage {
    let secret: string;
    if (entry.encSecret) {
      secret = entry.encSecret;
    } else if (entry.secret) {
      secret = entry.secret;
    } else {
      secret = "";
      console.warn("Invalid entry", entry);
    }

    let encrypted = Boolean(entry.encSecret);

    if (unencrypted && entry.secret) {
      secret = entry.secret;
      encrypted = false;
    }

    const storageItem: OTPStorage = {
      encrypted,
      hash: entry.hash,
      index: entry.index,
      type: OTPType[entry.type],
      secret
    };

    if (entry.pinned) {
      storageItem.pinned = true;
    }

    if (entry.type === OTPType.hotp || entry.type === OTPType.hhex) {
      storageItem.counter = entry.counter;
    }

    if (entry.period && entry.period !== 30) {
      storageItem.period = entry.period;
    }

    if (entry.issuer) {
      storageItem.issuer = entry.issuer;
    }

    if (entry.account) {
      storageItem.account = entry.account;
    }

    if (entry.digits && entry.digits !== 6) {
      storageItem.digits = entry.digits;
    }

    if (entry.algorithm && entry.algorithm !== OTPAlgorithm.SHA1) {
      storageItem.algorithm = OTPAlgorithm[entry.algorithm];
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

  private static isOTPStorage(entry: unknown) {
    if (typeof entry !== "object") {
      return false;
    }

    if (
      !entry ||
      !Object.prototype.hasOwnProperty.hasOwnProperty.call(entry, "secret")
    ) {
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
    return new Promise((resolve: (value: boolean) => void) => {
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
    });
  }

  static getExport(data: OTPEntryInterface[], encrypted?: boolean) {
    try {
      const exportData: { [hash: string]: OTPStorage } = {};
      for (const entry of data) {
        // Skip unable-decrypted data
        if (entry.code === CodeState.Encrypted) {
          continue;
        }

        if (!encrypted) {
          if (!entry.secret) {
            // Not unencrypted
          } else {
            exportData[entry.hash] = this.getOTPStorageFromEntry(
              entry as OTPEntry,
              true
            );
          }
        } else {
          exportData[entry.hash] = this.getOTPStorageFromEntry(
            entry as OTPEntry
          );
        }
      }
      return exportData;
    } catch (error) {
      return error;
    }
  }

  static backupGetExport(encryption: Encryption, encrypted?: boolean) {
    return new Promise(
      (
        resolve: (value: { [hash: string]: OTPStorage }) => void,
        reject: (reason: Error) => void
      ) => {
        try {
          BrowserStorage.get(async (_data: { [hash: string]: OTPStorage }) => {
            for (const hash of Object.keys(_data)) {
              if (!this.isValidEntry(_data, hash)) {
                delete _data[hash];
                continue;
              }
              // remove unnecessary fields
              if (
                !(_data[hash].type === OTPType[OTPType.hotp]) &&
                !(_data[hash].type === OTPType[OTPType.hhex])
              ) {
                delete _data[hash].counter;
              }

              if (_data[hash].period === 30) {
                delete _data[hash].period;
              }

              if (!_data[hash].issuer) {
                delete _data[hash].issuer;
              }

              if (!_data[hash].account) {
                delete _data[hash].account;
              }

              if (_data[hash].digits === 6) {
                delete _data[hash].digits;
              }

              if (_data[hash].algorithm === OTPAlgorithm[OTPAlgorithm.SHA1]) {
                delete _data[hash].algorithm;
              }

              delete _data[hash].pinned;

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
            Object.assign(_data, { key: await BrowserStorage.getKey() });
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
          BrowserStorage.get(async (_data: { [hash: string]: OTPStorage }) => {
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
              data[hash].digits = data[hash].digits || 6;
              data[hash].algorithm =
                data[hash].algorithm || OTPAlgorithm[OTPAlgorithm.SHA1];
              data[hash].pinned = data[hash].pinned || false;
              const period = data[hash].period;
              if (
                data[hash].type !== OTPType[OTPType.totp] ||
                (period && (isNaN(period) || period <= 0))
              ) {
                delete data[hash].period;
              }

              // If invalid digits, then use default.
              const digits = data[hash].digits;
              if (digits && (digits > 10 || digits < 1)) {
                data[hash].digits = 6;
              }

              // If invalid algorithm, then use default
              // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
              // @ts-ignore - it's fine if this ends up undefined
              if (!OTPAlgorithm[data[hash].algorithm]) {
                data[hash].algorithm = OTPAlgorithm[OTPAlgorithm.SHA1];
              }

              if (/^(blz-|bliz-)/.test(data[hash].secret)) {
                const secretMatches = data[hash].secret.match(
                  /^(blz-|bliz-)(.*)/
                );
                if (secretMatches && secretMatches.length >= 3) {
                  data[hash].secret = secretMatches[2];
                  data[hash].type = OTPType[OTPType.battle];
                }
              }

              if (/^stm-/.test(data[hash].secret)) {
                const secretMatches = data[hash].secret.match(/^stm-(.*)/);
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

              // not a valid / old hash
              if (
                !/^[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}$/.test(
                  hash
                )
              ) {
                const _hash = await uuid();

                data[_hash] = data[hash];
                data[_hash].hash = _hash;
                delete data[hash];

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

  static add(entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.set(
            { [entry.hash]: this.getOTPStorageFromEntry(entry) },
            resolve
          );
        } catch (error) {
          reject(error);
        }
      }
    );
  }

  static update(entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            if (!Object.prototype.hasOwnProperty.call(_data, entry.hash)) {
              throw new Error("Entry to change does not exist.");
            }
            const storageItem = this.getOTPStorageFromEntry(entry);
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

  static set(entries: OTPEntry[]) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            entries.forEach(entry => {
              const storageItem = this.getOTPStorageFromEntry(entry);
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

  static get() {
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

              if (!entryData.hash) {
                entryData.hash = hash;
              }

              if (!entryData.type) {
                entryData.type = OTPType[OTPType.totp];
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
              }

              let period: number | undefined;
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
                period,
                digits: entryData.digits,
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore - it's fine if this ends up undefined
                algorithm: OTPAlgorithm[entryData.algorithm],
                pinned: entryData.pinned
              });

              data.push(entry);

              data.sort((a, b) => {
                return a.index - b.index;
              });
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
    return new Promise((resolve: () => void) => {
      return BrowserStorage.remove(hash, resolve);
    });
  }

  static delete(entry: OTPEntry) {
    return new Promise(
      (resolve: () => void, reject: (reason: Error) => void) => {
        try {
          BrowserStorage.get((_data: { [hash: string]: OTPStorage }) => {
            if (Object.prototype.hasOwnProperty.call(_data, entry.hash)) {
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
          return resolve(false);
        }
        if (data) {
          if (data[key]) {
            return resolve(data[key]);
          }
        }
        return resolve(false);
      });
    });
  }
}
