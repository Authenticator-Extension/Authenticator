import { EntryStorage, BrowserStorage, isOldKey } from "../models/storage";
import { Encryption } from "../models/encryption";
import * as CryptoJS from "crypto-js";
import { OTPType, OTPAlgorithm } from "../models/otp";
import { ActionContext } from "vuex";
import { getSiteName, getMatchedEntriesHash } from "../utils";
import { isChromium } from "../browser";
import { StorageLocation, UserSettings } from "../models/settings";
import { DataType } from "../models/otp";

const LegacyEncryption = "LegacyEncryption";
export class Accounts implements Module {
  async getModule() {
    const cachedKeyInfo = await this.getCachedKeyInfo();
    const encryption: Map<string, EncryptionInterface> = new Map();
    if (cachedKeyInfo.cachedKeyId) {
      encryption.set(
        cachedKeyInfo.cachedKeyId,
        new Encryption(
          cachedKeyInfo.cachedPassphrase,
          cachedKeyInfo.cachedKeyId
        )
      );
    }
    const shouldShowPassphrase = await EntryStorage.hasEncryptionKey();
    const entries = shouldShowPassphrase ? [] : await this.getEntries();

    await UserSettings.updateItems();

    return {
      state: {
        entries,
        encryption,
        defaultEncryption: cachedKeyInfo.cachedKeyId,
        OTPType,
        OTPAlgorithm,
        shouldShowPassphrase,
        sectorStart: false, // Should display timer circles?
        sectorOffset: 0, // Offset in seconds for animations
        second: 0, // Offset in seconds for math
        filter: true,
        siteName: await getSiteName(),
        showSearch: false,
        exportData: await EntryStorage.getExport(entries),
        exportEncData: await EntryStorage.getExport(entries, true),
        keys: await BrowserStorage.getKeys(),
        wrongPassword: false,
        initComplete: false,
      },
      getters: {
        shouldFilter(
          state: AccountsState,
          getters: { matchedEntries: string[] }
        ) {
          return (
            UserSettings.items.smartFilter === true &&
            getters.matchedEntries.length
          );
        },
        matchedEntries: (state: AccountsState) => {
          return getMatchedEntriesHash(state.siteName, state.entries);
        },
        currentlyEncrypted(state: AccountsState) {
          for (const entry of state.entries) {
            if (entry.secret === null) {
              return true;
            }
          }
          return false;
        },
        entries(state: AccountsState) {
          const pinnedEntries = state.entries.filter((entry) => entry.pinned);
          const unpinnedEntries = state.entries.filter(
            (entry) => !entry.pinned
          );
          return [...pinnedEntries, ...unpinnedEntries];
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
          if (UserSettings.items.offset) {
            second += Number(UserSettings.items.offset);
          }

          if (second < 0) {
            // Handle the situation where offset causes `second` to be negative. #1310
            second = 60 - ((second * -1) % 60);
          } else {
            second = second % 60;
          }
          state.second = second;

          let currentlyEncrypted = false;

          for (const entry of state.entries) {
            if (entry.secret === null) {
              currentlyEncrypted = true;
            }
          }

          if (
            !state.sectorStart &&
            state.entries.length > 0 &&
            !currentlyEncrypted
          ) {
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
          const entries = state.entries as OTPEntryInterface[];
          for (let i = 0; i < entries.length; i++) {
            if (
              entries[i].type !== OTPType.hotp &&
              entries[i].type !== OTPType.hhex
            ) {
              entries[i].generate();
            }
          }
        },
        loadCodes(state: AccountsState, newCodes: OTPEntryInterface[]) {
          state.entries = newCodes;
        },
        moveCode(state: AccountsState, opts: { from: number; to: number }) {
          state.entries.splice(
            opts.to,
            0,
            state.entries.splice(opts.from, 1)[0]
          );

          for (let i = 0; i < state.entries.length; i++) {
            if (state.entries[i].index !== i) {
              state.entries[i].index = i;
            }
          }
        },
        pinEntry(state: AccountsState, entry: OTPEntryInterface) {
          state.entries[entry.index].pinned = !entry.pinned;
        },
        updateExport(
          state: AccountsState,
          exportData: { [k: string]: OTPEntryInterface }
        ) {
          state.exportData = exportData;
        },
        updateEncExport(
          state: AccountsState,
          data: {
            entries: { [k: string]: OTPEntryInterface };
            keys: Key[] | OldKey;
          }
        ) {
          if (isOldKey(data.keys)) {
            return;
          }

          const keys = data.keys.reduce((prev: { [id: string]: Key }, key) => {
            prev[key.id] = key;
            return prev;
          }, {});
          state.exportEncData = { ...data.entries, ...keys };
        },
        wrongPassword(state: AccountsState) {
          state.wrongPassword = true;
        },
        initComplete(state: AccountsState) {
          state.initComplete = true;
        },
      },
      actions: {
        deleteCode: async (
          state: ActionContext<AccountsState, object>,
          hash: string
        ) => {
          const index = state.state.entries.findIndex(
            (entry) => entry.hash === hash
          );
          if (index > -1) {
            state.state.entries.splice(index, 1);
          }
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit("updateEncExport", {
            entries: await EntryStorage.getExport(state.state.entries, true),
            keys: await BrowserStorage.getKeys(),
          });
        },
        addCode: async (
          state: ActionContext<AccountsState, object>,
          entry: OTPEntryInterface
        ) => {
          state.state.entries.unshift(entry);
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit("updateEncExport", {
            entries: await EntryStorage.getExport(state.state.entries, true),
            keys: await BrowserStorage.getKeys(),
          });
        },
        applyPassphrase: async (
          state: ActionContext<AccountsState, object>,
          password: string
        ) => {
          if (!password) {
            return;
          }

          state.commit("currentView/changeView", "LoadingPage", { root: true });

          // Decrypt entries
          let saltedHash = "";
          let migrationNeeded = false;
          const encKeys = await BrowserStorage.getKeys();
          if (isOldKey(encKeys)) {
            // --- handle v2 encryption
            // decrypt using key
            const key = CryptoJS.AES.decrypt(encKeys.enc, password).toString();
            const isCorrectPassword = await new Promise(
              (resolve: (value: string) => void) => {
                const iframe = document.getElementById("argon-sandbox");
                const message = {
                  action: "verify",
                  value: key,
                  hash: encKeys.hash,
                };
                if (iframe) {
                  window.addEventListener("message", (response) => {
                    resolve(response.data.response);
                  });
                  // @ts-expect-error - bad typings
                  iframe.contentWindow.postMessage(message, "*");
                }
              }
            );

            if (!isCorrectPassword) {
              state.commit("wrongPassword");
              state.commit("currentView/changeView", "EnterPasswordPage", {
                root: true,
              });
              return;
            }

            state.state.encryption.set(
              LegacyEncryption,
              new Encryption(key, LegacyEncryption)
            );

            migrationNeeded = true;
          } else if (encKeys.length === 0) {
            // --- handle v1 encryption
            // verify current password
            state.state.encryption.set(
              LegacyEncryption,
              new Encryption(password, LegacyEncryption)
            );
            await state.dispatch("updateEntries");

            if (state.getters.currentlyEncrypted) {
              state.commit("wrongPassword");
              state.commit("currentView/changeView", "EnterPasswordPage", {
                root: true,
              });
              return;
            }

            migrationNeeded = true;
          } else {
            // --- handle v3 encryption
            // TODO: let user reconcile multiple keys from sync conflicts
            for (const key of encKeys) {
              const rawHash = await new Promise(
                (resolve: (value: string) => void) => {
                  const iframe = document.getElementById("argon-sandbox");
                  const message = {
                    action: "hash",
                    value: password,
                    salt: key.salt,
                  };
                  if (iframe) {
                    window.addEventListener("message", (response) => {
                      resolve(response.data.response);
                    });
                    // @ts-expect-error bad typings
                    iframe.contentWindow.postMessage(message, "*");
                  }
                }
              );

              // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
              const possibleHash = rawHash.split("$")[5];
              if (!possibleHash) {
                throw new Error("argon2 did not return a hash!");
              }

              // verify user password by comparing their password hash with the
              // hash of their password's hash
              const isCorrectPassword = await new Promise(
                (resolve: (value: string) => void) => {
                  const iframe = document.getElementById("argon-sandbox");
                  const message = {
                    action: "verify",
                    value: possibleHash,
                    hash: key.hash,
                  };
                  if (iframe) {
                    window.addEventListener("message", (response) => {
                      resolve(response.data.response);
                    });
                    // @ts-expect-error bad typings
                    iframe.contentWindow.postMessage(message, "*");
                  }
                }
              );

              // TODO: there is a serious bug here. If two keys have the same password,
              // then only one of them will be used for decryption.
              if (isCorrectPassword) {
                state.state.encryption.set(
                  key.id,
                  new Encryption(possibleHash, key.id)
                );
                state.state.defaultEncryption = key.id;

                saltedHash = possibleHash;
              }
            }

            await state.dispatch("updateEntries");

            if (!saltedHash) {
              state.commit("wrongPassword");
              state.commit("currentView/changeView", "EnterPasswordPage", {
                root: true,
              });
              return;
            }
          }

          // Migrate from older encryption if needed
          if (migrationNeeded) {
            // gen hashes

            // The hash of the user's password is used as the encryption key for user data.
            const rawSaltedHash = await genHash(password);
            // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
            const salt = window.atob(rawSaltedHash.split("$")[4]);
            saltedHash = rawSaltedHash.split("$")[5];

            // This hash is used to verify that a user decrypted `saltedHash` correctly
            const hashOfHash = await genHash(saltedHash);

            if (!saltedHash || !hashOfHash) {
              throw new Error("argon2 did not return a hash!");
            }

            // update entry encryption
            const key: Key = {
              dataType: DataType.Key,
              id: crypto.randomUUID(),
              salt: salt,
              hash: hashOfHash,
              version: 3,
            };
            const newEncryption = new Encryption(saltedHash, key.id);
            state.state.encryption.set(key.id, newEncryption);
            state.state.defaultEncryption = key.id;

            const toRemove: string[] = [];
            for (const entry of state.state.entries) {
              if (!entry.secret) {
                continue;
              }

              await entry.changeEncryption(newEncryption);

              // if not uuidv4 regen
              if (
                /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/i.test(
                  entry.hash
                )
              ) {
                entry.genUUID();
                toRemove.push(entry.hash);
              }
            }

            // store key
            await BrowserStorage.set({
              [key.id]: key,
            });
            await EntryStorage.set(state.state.entries);
            await BrowserStorage.remove(toRemove);
            await BrowserStorage.remove("key");

            await state.dispatch("updateEntries");
          }

          if (!saltedHash) {
            throw new Error("Empty saltedHash! This should never happen.");
          }

          // Encrypt any unencrypted entries.
          // Browser sync can cause unencrypted entries to show up.
          let needUpdateStorage = false;
          const defaultEncryption = state.state.encryption.get(
            state.state.defaultEncryption
          );
          if (!defaultEncryption) {
            throw new Error(
              "defaultEncryption is empty, this should never happen!"
            );
          }
          for (const entry of state.state.entries) {
            if (
              entry.encryption?.getEncryptionKeyId() !==
              state.state.defaultEncryption
            ) {
              await entry.changeEncryption(defaultEncryption);
              needUpdateStorage = true;
            }
          }

          if (needUpdateStorage) {
            await EntryStorage.set(state.state.entries);
            await state.dispatch("updateEntries");
          }

          if (!state.getters.currentlyEncrypted) {
            chrome.runtime.sendMessage({
              action: "cachePassphrase",
              value: saltedHash,
              keyId: defaultEncryption.getEncryptionKeyId(),
            });
          }

          state.commit("style/hideInfo", true, { root: true });
          return;
        },
        changePassphrase: async (
          state: ActionContext<AccountsState, object>,
          password: string
        ) => {
          if (password) {
            // The hash of the user's password is used as the encryption key for user data.
            const rawSaltedHash = await genHash(password);
            // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
            const salt = window.atob(rawSaltedHash.split("$")[4]);
            const saltedHash = rawSaltedHash.split("$")[5];

            // This hash is used to verify that a user decrypted `saltedHash` correctly
            const hashOfHash = await genHash(saltedHash);

            if (!saltedHash || !hashOfHash) {
              throw new Error("argon2 did not return a hash!");
            }

            // change entry encryption and regen hash
            const removeKeys: string[] = [];
            const keys = await BrowserStorage.getKeys();
            if (isOldKey(keys)) {
              throw new Error(
                "OldKey still being used. This should never happen!"
              );
            }
            const key: Key = {
              dataType: DataType.Key,
              id: crypto.randomUUID(),
              salt: salt,
              hash: hashOfHash,
              version: 3,
            };

            const linkedKeys = new Map<string, undefined>();
            for (const entry of state.state.entries) {
              await entry.changeEncryption(new Encryption(saltedHash, key.id));
              // if not uuidv4 regen
              if (
                /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/i.test(
                  entry.hash
                )
              ) {
                removeKeys.push(entry.hash);
                entry.genUUID();
              }

              if (entry.encryption?.getEncryptionKeyId()) {
                linkedKeys.set(
                  entry.encryption.getEncryptionKeyId(),
                  undefined
                );
              }
            }

            // store key
            await BrowserStorage.set({
              [key.id]: key,
            });
            await EntryStorage.set(state.state.entries);
            // remove unlinked keys when there is at least one entry
            if (state.state.entries.length !== 0) {
              for (const storedKey of keys) {
                if (!linkedKeys.has(storedKey.id)) {
                  removeKeys.push(storedKey.id);
                }
              }
            }
            if (removeKeys.length) {
              await BrowserStorage.remove(removeKeys);
            }

            state.state.encryption.set(
              key.id,
              new Encryption(saltedHash, key.id)
            );
            state.state.defaultEncryption = key.id;

            await state.dispatch("updateEntries");

            // https://github.com/Authenticator-Extension/Authenticator/issues/412
            if (isChromium) {
              await BrowserStorage.clearLogs();
            }

            chrome.runtime.sendMessage({
              action: "cachePassphrase",
              value: saltedHash,
              keyId: key.id,
            });
          } else {
            for (const entry of state.state.entries) {
              await entry.changeEncryption(new Encryption("", ""));
            }
            await EntryStorage.set(state.state.entries);

            await BrowserStorage.remove("key");
            const keyId = state.state.encryption
              .get(state.state.defaultEncryption)
              ?.getEncryptionKeyId();
            if (keyId) {
              await BrowserStorage.remove(keyId);
            }
            state.state.defaultEncryption = "";

            await state.dispatch("updateEntries");

            chrome.runtime.sendMessage({
              action: "lock",
            });
          }

          // remove cached passphrase in old version
          UserSettings.items.encodedPhrase = undefined;
          await UserSettings.removeItem("encodedPhrase");
        },
        updateEntries: async (state: ActionContext<AccountsState, object>) => {
          const entries = await this.getEntries();

          for (const entry of entries) {
            // LegacyEncryption indicates that we need to use backwards compatibility logic
            if (entry.encSecret) {
              const legacyEncryption = state.state.encryption.get(
                LegacyEncryption
              );
              if (legacyEncryption) {
                await entry.applyEncryption(legacyEncryption);
              }
            } else if (entry.keyId) {
              const entryEncryption = state.state.encryption.get(entry.keyId);
              if (entryEncryption) {
                await entry.applyEncryption(entryEncryption);
              }
            }
          }

          state.commit("loadCodes", entries);
          state.commit("updateCodes");
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries)
          );
          state.commit("updateEncExport", {
            entries: await EntryStorage.getExport(state.state.entries, true),
            keys: await BrowserStorage.getKeys(),
          });
          state.commit("initComplete");
          return;
        },
        clearFilter: (state: ActionContext<AccountsState, object>) => {
          state.commit("stopFilter");
          if (state.state.entries.length >= 10) {
            state.commit("showSearch");
          }
        },
        migrateStorage: async (
          state: ActionContext<AccountsState, object>,
          newStorageLocation: string
        ) => {
          // sync => local
          if (
            UserSettings.items.storageLocation === StorageLocation.Sync &&
            newStorageLocation === StorageLocation.Local
          ) {
            const syncData = await chrome.storage.sync.get();
            await chrome.storage.local.set(syncData); // userSettings will be handled later
            const localData = await chrome.storage.local.get();

            // Double check if data was set
            if (
              Object.keys(syncData).every(
                (value) => Object.keys(localData).indexOf(value) >= 0
              )
            ) {
              UserSettings.items.storageLocation = StorageLocation.Local;
              await chrome.storage.sync.clear();
              await chrome.storage.local.set({
                UserSettings: UserSettings.items,
              });
              return "updateSuccess";
            } else {
              throw " All data not transferred successfully.";
            }
            // local => sync
          } else if (
            UserSettings.items.storageLocation === StorageLocation.Local &&
            newStorageLocation === StorageLocation.Sync
          ) {
            const localData = await chrome.storage.local.get();
            if (localData?.UserSettings) {
              delete localData.UserSettings;
              await chrome.storage.sync.set(localData);
            }
            const syncData = await chrome.storage.sync.get();

            // Double check if data was set
            if (
              Object.keys(localData).every(
                (value) => Object.keys(syncData).indexOf(value) >= 0
              )
            ) {
              UserSettings.items.storageLocation = StorageLocation.Sync;
              await chrome.storage.local.clear();
              await UserSettings.commitItems();
              return "updateSuccess";
            } else {
              throw " All data not transferred successfully.";
            }
          }

          // No change
          return "updateSuccess";
        },
      },
      namespaced: true,
    };
  }

  private async getCachedKeyInfo() {
    const {
      cachedPassphrase,
      cachedKeyId,
    } = await chrome.storage.session.get();

    return { cachedPassphrase, cachedKeyId };
  }

  private async getEntries() {
    const otpEntries = await EntryStorage.get();
    return otpEntries;
  }
}

async function genHash(value: string) {
  const randomValues = window.crypto.getRandomValues(new Uint16Array(8));
  let salt = "";
  for (const byte of randomValues) {
    salt += byte.toString(16);
  }

  return new Promise((resolve: (value: string) => void) => {
    const iframe = document.getElementById("argon-sandbox");
    const message = {
      action: "hash",
      value: value,
      salt,
    };
    if (iframe) {
      window.addEventListener("message", (response) => {
        resolve(response.data.response);
      });
      // @ts-expect-error bad typings
      iframe.contentWindow.postMessage(message, "*");
    }
  });
}
