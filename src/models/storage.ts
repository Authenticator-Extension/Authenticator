/* tslint:disable:no-reference */
/// <reference path="./encryption.ts" />
/// <reference path="./interface.ts" />
/// <reference path="./otp.ts" />

class BrowserStorage {
  private static getStorageLocation() {
    if (localStorage.storageLocation !== 'sync' &&
        localStorage.storageLocation !== 'local') {
      return new Promise((resolve, reject) => {
        let amountSync: number;
        let amountLocal: number;
        chrome.storage.local.get((local) => {
          amountLocal = Object.keys(local).length;
          try {
            chrome.storage.sync.get((sync) => {
              amountSync = Object.keys(sync).length;
              // If storage location can't be found try to auto-detect storage
              // location
              if (amountLocal > amountSync && amountSync === 0) {
                localStorage.storageLocation = 'local';
              } else if (amountLocal < amountSync && amountLocal === 0) {
                localStorage.storageLocation = 'sync';
              } else {
                // Use default
                if (navigator.userAgent.indexOf('Edge') !== -1) {
                  localStorage.storageLocation = 'local';
                } else {
                  localStorage.storageLocation = 'sync';
                }
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
      return new Promise((resolve) => {
        resolve(localStorage.storageLocation);
        return;
      });
    }
  }

  /* tslint:disable-next-line:no-any */
  static async get(callback: (items: {[key: string]: any;}) => void) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === 'local') {
      chrome.storage.local.get(callback);
    } else if (storageLocation === 'sync') {
      chrome.storage.sync.get(callback);
    }
    return;
  }

  static async set(data: object, callback?: (() => void)|undefined) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === 'local') {
      chrome.storage.local.set(data, callback);
    } else if (storageLocation === 'sync') {
      chrome.storage.sync.set(data, callback);
    }
    return;
  }

  static async remove(
      data: string|string[], callback?: (() => void)|undefined) {
    const storageLocation = await this.getStorageLocation();
    if (storageLocation === 'local') {
      chrome.storage.local.remove(data, callback);
    } else if (storageLocation === 'sync') {
      chrome.storage.sync.remove(data, callback);
    }
    return;
  }
}

class EntryStorage {
  private static getOTPStorageFromEntry(
      encryption: Encryption, entry: OTPEntry): OTPStorage {
    const storageItem: OTPStorage = {
      account: entry.account,
      hash: entry.hash,
      index: entry.index,
      issuer: entry.issuer,
      type: OTPType[entry.type],
      counter: entry.counter,
      secret: encryption.getEncryptedSecret(entry.secret),
      encrypted: encryption.getEncryptionStatus()
    };
    if (entry.period && entry.period !== 30) {
      storageItem.period = entry.period;
    }
    return storageItem;
  }

  private static ensureUniqueIndex(_data: {[hash: string]: OTPStorage}) {
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

    const newData: {[hash: string]: OTPStorage} = {};
    for (let i = 0; i < tempEntryArray.length; i++) {
      tempEntryArray[i].index = i;
      newData[tempEntryArray[i].hash] = tempEntryArray[i];
    }

    return newData;
  }

  /* tslint:disable-next-line:no-any */
  private static isOTPStorage(entry: any) {
    if (!entry || !entry.hasOwnProperty('secret')) {
      return false;
    }

    return true;
  }

  private static isValidEntry(
      _data: {[hash: string]: OTPStorage}, hash: string) {
    if (typeof _data[hash] !== 'object') {
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

  static async hasEncryptedEntry() {
    return new Promise(
        (resolve: (value: boolean) => void,
         reject: (reason: Error) => void) => {
          BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
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

  static async getExport(encryption: Encryption, encrypted?: boolean) {
    return new Promise(
        (resolve: (value: {[hash: string]: OTPStorage}) => void,
         reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
              for (const hash of Object.keys(_data)) {
                if (!this.isValidEntry(_data, hash)) {
                  delete _data[hash];
                  continue;
                }
                if (!encrypted) {
                  // decrypt the data to export
                  if (_data[hash].encrypted) {
                    const decryptedSecret =
                        encryption.getDecryptedSecret(_data[hash].secret, hash);
                    if (decryptedSecret !== _data[hash].secret &&
                        decryptedSecret !== 'Encrypted') {
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
        });
  }

  static async import(
      encryption: Encryption, data: {[hash: string]: OTPStorage}) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
              for (const hash of Object.keys(data)) {
                // never trust data import from user
                // we do not support encrypted data import any longer
                if (!data[hash].secret || data[hash].encrypted) {
                  // we need give a failed warning
                  continue;
                }

                data[hash].hash = data[hash].hash || hash;
                data[hash].account = data[hash].account || '';
                data[hash].encrypted = encryption.getEncryptionStatus();
                data[hash].index = data[hash].index || 0;
                data[hash].issuer = data[hash].issuer || '';
                data[hash].type = data[hash].type || OTPType[OTPType.totp];
                data[hash].counter = data[hash].counter || 0;
                const period = data[hash].period;
                if (data[hash].type !== OTPType[OTPType.totp] ||
                    period && (isNaN(period) || period <= 0)) {
                  delete data[hash].period;
                }

                if (/^(blz\-|bliz\-)/.test(data[hash].secret)) {
                  const secretMatches =
                      data[hash].secret.match(/^(blz\-|bliz\-)(.*)/);
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

                if (!/^[a-z2-7]+=*$/i.test(data[hash].secret) &&
                    /^[0-9a-f]+$/i.test(data[hash].secret) &&
                    data[hash].type === OTPType[OTPType.totp]) {
                  data[hash].type = OTPType[OTPType.hex];
                }

                if (!/^[a-z2-7]+=*$/i.test(data[hash].secret) &&
                    /^[0-9a-f]+$/i.test(data[hash].secret) &&
                    data[hash].type === OTPType[OTPType.hotp]) {
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
                  data[_hash].secret =
                      encryption.getEncryptedSecret(data[_hash].secret);
                  _data[_hash] = data[_hash];
                } else {
                  data[hash].secret =
                      encryption.getEncryptedSecret(data[hash].secret);
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
        });
  }

  static async add(encryption: Encryption, entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
              if (_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry has already existed.');
              }
              const storageItem =
                  this.getOTPStorageFromEntry(encryption, entry);
              _data[entry.hash] = storageItem;
              _data = this.ensureUniqueIndex(_data);
              BrowserStorage.set(_data, resolve);
            });
            return;
          } catch (error) {
            return reject(error);
          }
        });
  }

  static async update(encryption: Encryption, entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
              if (!_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry is not existing.');
              }
              const storageItem =
                  this.getOTPStorageFromEntry(encryption, entry);
              _data[entry.hash] = storageItem;
              _data = this.ensureUniqueIndex(_data);
              BrowserStorage.set(_data, resolve);
            });
            return;
          } catch (error) {
            return reject(error);
          }
        });
  }

  static async set(encryption: Encryption, entries: OTPEntry[]) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
              entries.forEach(entry => {
                const storageItem =
                    this.getOTPStorageFromEntry(encryption, entry);
                _data[entry.hash] = storageItem;
              });
              _data = this.ensureUniqueIndex(_data);
              BrowserStorage.set(_data, resolve);
            });
            return;
          } catch (error) {
            reject(error);
          }
        });
  }

  static async get(encryption: Encryption) {
    return new Promise(
        (resolve: (value: OTPEntry[]) => void,
         reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get(async (_data: {[hash: string]: OTPStorage}) => {
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
                  case 'totp':
                  case 'hotp':
                  case 'battle':
                  case 'steam':
                  case 'hex':
                  case 'hhex':
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
                if (entryData.type === OTPType[OTPType.totp] &&
                    entryData.period && entryData.period > 0) {
                  period = entryData.period;
                }

                entryData.secret = entryData.encrypted ?
                    encryption.getDecryptedSecret(entryData.secret, hash) :
                    entryData.secret;

                // we need migrate secret in old format here
                if (/^(blz\-|bliz\-)/.test(entryData.secret)) {
                  const secretMatches =
                      entryData.secret.match(/^(blz\-|bliz\-)(.*)/);
                  if (secretMatches && secretMatches.length >= 3) {
                    entryData.secret = secretMatches[2];
                    entryData.type = OTPType[OTPType.battle];
                    entryData.hash = CryptoJS.MD5(entryData.secret).toString();
                    await this.remove(hash);
                    needMigrate = true;
                  }
                }

                if (/^stm\-/.test(entryData.secret)) {
                  const secretMatches = entryData.secret.match(/^stm\-(.*)/);
                  if (secretMatches && secretMatches.length >= 2) {
                    entryData.secret = secretMatches[1];
                    entryData.type = OTPType[OTPType.steam];
                    entryData.hash = CryptoJS.MD5(entryData.secret).toString();
                    await this.remove(hash);
                    needMigrate = true;
                  }
                }

                if (!/^[a-z2-7]+=*$/i.test(entryData.secret) &&
                    /^[0-9a-f]+$/i.test(entryData.secret) &&
                    entryData.type === OTPType[OTPType.totp]) {
                  entryData.type = OTPType[OTPType.hex];
                  needMigrate = true;
                }

                if (!/^[a-z2-7]+=*$/i.test(entryData.secret) &&
                    /^[0-9a-f]+$/i.test(entryData.secret) &&
                    entryData.type === OTPType[OTPType.hotp]) {
                  entryData.type = OTPType[OTPType.hhex];
                  needMigrate = true;
                }

                const entry = new OTPEntry(
                    type, entryData.issuer, entryData.secret, entryData.account,
                    entryData.index, entryData.counter, period, entryData.hash);
                data.push(entry);

                // <del>we need correct the hash</del>

                // Do not correct hash, wrong password
                // may not only 'Encrypted', but also
                // other wrong secret. We cannot know
                // if the hash doesn't match the correct
                // secret

                // Only correct invalid hash here

                if (entry.secret !== 'Encrypted' &&
                    !/^[0-9a-f]{32}$/.test(hash)) {
                  const _hash = CryptoJS.MD5(entryData.secret).toString();
                  if (hash !== _hash) {
                    await this.remove(hash);
                    entryData.hash = _hash;
                    needMigrate = true;
                  }
                }

                if (needMigrate) {
                  const _entry: {[hash: string]: OTPStorage} = {};
                  _entry[entryData.hash] = entryData;
                  _entry[entryData.hash].encrypted = false;
                  this.import(encryption, _entry);
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
        });
  }

  static async remove(hash: string) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          return BrowserStorage.remove(hash, resolve);
        });
  }

  static async delete(entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            BrowserStorage.get((_data: {[hash: string]: OTPStorage}) => {
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
        });
  }
}
