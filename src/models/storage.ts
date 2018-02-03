/// <reference path="./encryption.ts" />
/// <reference path="./interface.ts" />
/// <reference path="./otp.ts" />

class entryStorage {
  private static getOTPStorageFromEntry(
      encryption: Encription, entry: OTPEntry): OTPStorage {
    const storageItem: OTPStorage = {
      account: entry.account,
      hash: entry.hash,
      index: entry.index,
      issuer: entry.issuer,
      type: OTPType[entry.type],
      secret: encryption.getEncryptedSecret(entry.secret),
      encrypted: encryption.getEncryptionStatus()
    };
    return storageItem;
  }

  private static ensureUniqueIndex(_data: {[hash: string]: OTPStorage}) {
    const tempEntryArray: OTPStorage[] = [];

    for (const hash of Object.keys(_data)) {
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

  static async add(encryption: Encription, entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OTPStorage}) => {
              if (_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry has already existed.');
              }
              const storageItem =
                  this.getOTPStorageFromEntry(encryption, entry);
              _data[entry.hash] = storageItem;
              _data = this.ensureUniqueIndex(_data);
              chrome.storage.sync.set(_data, Promise.resolve);
            });
            return;
          } catch (error) {
            return Promise.reject(error);
          }
        });
  }

  static async update(encryption: Encription, entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OTPStorage}) => {
              if (!_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry is not existing.');
              }
              const storageItem =
                  this.getOTPStorageFromEntry(encryption, entry);
              _data[entry.hash] = storageItem;
              _data = this.ensureUniqueIndex(_data);
              chrome.storage.sync.set(_data, Promise.resolve);
            });
            return;
          } catch (error) {
            return Promise.reject(error);
          }
        });
  }

  static async get() {
    return new Promise(
        (resolve: (value: OTPEntry[]) => void,
         reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OTPStorage}) => {
              const data: OTPEntry[] = [];
              for (const hash of Object.keys(_data)) {
                const entryData = _data[hash];
                let type: OTPType;
                switch (entryData.type) {
                  case 'totp':
                  case 'hotp':
                  case 'battle':
                  case 'steam':
                    type = OTPType[entryData.type];
                    break;
                  default:
                    type = OTPType.totp;
                }
                const entry = new OTPEntry(
                    type, entryData.issuer, entryData.secret, entryData.account,
                    entryData.index);
                data.push(entry);
              }
              Promise.resolve(data);
            });
            return;
          } catch (error) {
            return Promise.reject(error);
          }
        });
  }

  static async delete(entry: OTPEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OTPStorage}) => {
              if (_data.hasOwnProperty(entry.hash)) {
                delete _data[entry.hash];
              }
              _data = this.ensureUniqueIndex(_data);
              return Promise.resolve();
            });
            return;
          } catch (error) {
            return Promise.reject(error);
          }
        });
  }
}