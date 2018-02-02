import {Encription} from './encryption';
import {OPTStorage, OPTType} from './interface';
import {OPTEntry} from './opt';

export class Storage {
  private static getOPTStorageFromEntry(
      encryption: Encription, entry: OPTEntry): OPTStorage {
    const storageItem: OPTStorage = {
      account: entry.account,
      hash: entry.hash,
      index: entry.index,
      issuer: entry.issuer,
      type: OPTType[entry.type],
      secret: encryption.getEncryptedSecret(entry.secret),
      encrypted: encryption.getEncryptionStatus()
    };
    return storageItem;
  }

  private static ensureUniqueIndex(_data: {[hash: string]: OPTStorage}) {
    const tempEntryArray: OPTStorage[] = [];

    for (const hash of Object.keys(_data)) {
      tempEntryArray.push(_data[hash]);
    }

    tempEntryArray.sort((a, b) => {
      return a.index - b.index;
    });

    const newData: {[hash: string]: OPTStorage} = {};
    for (let i = 0; i < tempEntryArray.length; i++) {
      tempEntryArray[i].index = i;
      newData[tempEntryArray[i].hash] = tempEntryArray[i];
    }

    return newData;
  }

  static async add(encryption: Encription, entry: OPTEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OPTStorage}) => {
              if (_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry has already existed.');
              }
              const storageItem =
                  this.getOPTStorageFromEntry(encryption, entry);
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

  static async update(encryption: Encription, entry: OPTEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OPTStorage}) => {
              if (!_data.hasOwnProperty(entry.hash)) {
                throw new Error('The specific entry is not existing.');
              }
              const storageItem =
                  this.getOPTStorageFromEntry(encryption, entry);
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
        (resolve: (value: OPTEntry[]) => void,
         reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OPTStorage}) => {
              const data: OPTEntry[] = [];
              for (const hash of Object.keys(_data)) {
                const entryData = _data[hash];
                let type: OPTType;
                switch (entryData.type) {
                  case 'totp':
                  case 'hotp':
                  case 'battle':
                  case 'steam':
                    type = OPTType[entryData.type];
                    break;
                  default:
                    type = OPTType.totp;
                }
                const entry = new OPTEntry(
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

  static async delete(entry: OPTEntry) {
    return new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            chrome.storage.sync.get((_data: {[hash: string]: OPTStorage}) => {
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