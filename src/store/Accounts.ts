import { EntryStorage, BrowserStorage, isOldKey } from "../models/storage";
import { Encryption } from "../models/encryption";
import * as CryptoJS from "crypto-js";
import { OTPType, OTPAlgorithm } from "../models/otp";
import { ActionContext } from "vuex";
import { useCurrentViewStore } from "./CurrentView";
import { useStyleStore } from "./Style";
import { getSiteName, getMatchedEntriesHash } from "../utils";
import { isChromium } from "../browser";
import { StorageLocation, UserSettings } from "../models/settings";
import { DataType } from "../models/otp";
import { argonHash, argonVerify } from "../models/password";

const LegacyEncryption = "LegacyEncryption";
// uuidv4 shape; entries whose hash is not a uuidv4 get their hash regenerated
const UUIDV4_REGEX =
  /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/i;
export class Accounts implements Module {
  async getModule() {
    const cachedKeyInfo = await this.getCachedKeyInfo();
    const encryption: Map<string, EncryptionInterface> = new Map();
    if (cachedKeyInfo.cachedKeyId) {
      encryption.set(
        cachedKeyInfo.cachedKeyId as string,
        new Encryption(
          cachedKeyInfo.cachedPassphrase as string,
          cachedKeyInfo.cachedKeyId as string,
        ),
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
          getters: { matchedEntries: string[] },
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
            (entry) => !entry.pinned,
          );
          return [...pinnedEntries, ...unpinnedEntries];
        },
      },
      mutations: {
        stopFilter(state: AccountsState) {
          state.filter = false;
        },
        startFilter(state: AccountsState) {
          state.filter = true;
        },
        showSearch(state: AccountsState) {
          state.showSearch = true;
        },
        updateCodes(state: AccountsState) {
          let second = new Date().getSeconds();
          if (UserSettings.items.offset) {
            second += Number(UserSettings.items.offset);
          }

          // positive modulo so any offset (incl. < -60) stays in 0..59 (#1310)
          second = ((second % 60) + 60) % 60;
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

          for (const entry of state.entries) {
            if (entry.type !== OTPType.hotp && entry.type !== OTPType.hhex) {
              entry.generate();
            }
          }
        },
        loadCodes(state: AccountsState, newCodes: OTPEntryInterface[]) {
          state.entries = newCodes;
        },
        // vuedraggable hands back the reordered (pinned-first) displayed array;
        // re-index by position and store it. The `entries` getter re-derives
        // the pinned-first view from this, so drags within a group stick.
        reorderEntries(state: AccountsState, reordered: OTPEntryInterface[]) {
          reordered.forEach((entry, i) => {
            entry.index = i;
          });
          state.entries = reordered;
        },
        pinEntry(state: AccountsState, entry: OTPEntryInterface) {
          state.entries[entry.index].pinned = !entry.pinned;
        },
        // Re-anchor the timer-circle animation phase to the current second.
        // Reordering (pin/drag) re-attaches the entry's DOM node, which restarts
        // its CSS animation; without re-syncing it would resume from the stale
        // load-time sectorOffset and the countdown circle would drift until the
        // popup is reopened.
        resyncSector(state: AccountsState) {
          state.sectorOffset = -state.second;
        },
        updateExport(
          state: AccountsState,
          exportData: { [k: string]: OTPEntryInterface },
        ) {
          state.exportData = exportData;
        },
        updateEncExport(
          state: AccountsState,
          data: {
            entries: { [k: string]: OTPEntryInterface };
            keys: Key[] | OldKey;
          },
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
        // --- mutations routed for Vuex strict mode (state must only change here)
        removeEntry(state: AccountsState, hash: string) {
          const index = state.entries.findIndex((entry) => entry.hash === hash);
          if (index > -1) {
            state.entries.splice(index, 1);
          }
        },
        addEntry(state: AccountsState, entry: OTPEntryInterface) {
          state.entries.unshift(entry);
        },
        setDefaultEncryption(state: AccountsState, keyId: string) {
          state.defaultEncryption = keyId;
        },
        setEncryption(
          state: AccountsState,
          payload: { keyId: string; encryption: EncryptionInterface },
        ) {
          state.encryption.set(payload.keyId, payload.encryption);
        },
        setEntryField(
          state: AccountsState,
          payload: {
            entry: OTPEntryInterface;
            field: "issuer" | "account" | "host";
            value: string;
          },
        ) {
          payload.entry[payload.field] = payload.value;
        },
        applyEntryEncryption(
          state: AccountsState,
          payload: {
            entry: OTPEntryInterface;
            encryption: EncryptionInterface;
          },
        ) {
          payload.entry.changeEncryption(payload.encryption);
        },
        regenEntryHash(state: AccountsState, entry: OTPEntryInterface) {
          entry.genUUID();
        },
        // in-memory part of OTPEntry.next(); persistence (entry.update()) stays
        // in the action since mutations must be synchronous
        advanceHotpCounter(state: AccountsState, entry: OTPEntryInterface) {
          entry.generate();
          if (entry.secret !== null) {
            entry.counter++;
          }
        },
      },
      actions: {
        deleteCode: async (
          state: ActionContext<AccountsState, object>,
          hash: string,
        ) => {
          state.commit("removeEntry", hash);
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries),
          );
          state.commit("updateEncExport", {
            entries: await EntryStorage.getExport(state.state.entries, true),
            keys: await BrowserStorage.getKeys(),
          });
        },
        addCode: async (
          state: ActionContext<AccountsState, object>,
          entry: OTPEntryInterface,
        ) => {
          state.commit("addEntry", entry);
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries),
          );
          state.commit("updateEncExport", {
            entries: await EntryStorage.getExport(state.state.entries, true),
            keys: await BrowserStorage.getKeys(),
          });
        },
        applyPassphrase: async (
          state: ActionContext<AccountsState, object>,
          password: string,
        ) => {
          if (!password) {
            return;
          }

          useCurrentViewStore().changeView("LoadingPage");

          // Decrypt entries
          let saltedHash = "";
          let migrationNeeded = false;
          const encKeys = await BrowserStorage.getKeys();
          if (isOldKey(encKeys)) {
            // --- handle v2 encryption
            // decrypt using key
            const key = CryptoJS.AES.decrypt(encKeys.enc, password).toString();
            const isCorrectPassword = await argonVerify(key, encKeys.hash);

            if (!isCorrectPassword) {
              state.commit("wrongPassword");
              useCurrentViewStore().changeView("EnterPasswordPage");
              return;
            }

            state.commit("setEncryption", {
              keyId: LegacyEncryption,
              encryption: new Encryption(key, LegacyEncryption),
            });

            migrationNeeded = true;
          } else if (encKeys.length === 0) {
            // --- handle v1 encryption
            // verify current password
            state.commit("setEncryption", {
              keyId: LegacyEncryption,
              encryption: new Encryption(password, LegacyEncryption),
            });
            await state.dispatch("updateEntries");

            if (state.getters.currentlyEncrypted) {
              state.commit("wrongPassword");
              useCurrentViewStore().changeView("EnterPasswordPage");
              return;
            }

            migrationNeeded = true;
          } else {
            // --- handle v3 encryption
            // TODO: let user reconcile multiple keys from sync conflicts
            for (const key of encKeys) {
              const rawHash = await argonHash(password, key.salt);

              // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
              const possibleHash = rawHash ? rawHash.split("$")[5] : "";
              if (!possibleHash) {
                throw new Error("argon2 did not return a hash!");
              }

              // verify user password by comparing their password hash with the
              // hash of their password's hash
              const isCorrectPassword = await argonVerify(
                possibleHash,
                key.hash,
              );

              // TODO: there is a serious bug here. If two keys have the same password,
              // then only one of them will be used for decryption.
              if (isCorrectPassword) {
                state.commit("setEncryption", {
                  keyId: key.id,
                  encryption: new Encryption(possibleHash, key.id),
                });
                state.commit("setDefaultEncryption", key.id);

                saltedHash = possibleHash;
              }
            }

            await state.dispatch("updateEntries");

            if (!saltedHash) {
              state.commit("wrongPassword");
              useCurrentViewStore().changeView("EnterPasswordPage");
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
            state.commit("setEncryption", {
              keyId: key.id,
              encryption: newEncryption,
            });
            state.commit("setDefaultEncryption", key.id);

            const toRemove: string[] = [];
            for (const entry of state.state.entries) {
              if (!entry.secret) {
                continue;
              }

              state.commit("applyEntryEncryption", {
                entry,
                encryption: newEncryption,
              });

              // if not uuidv4 regen
              if (UUIDV4_REGEX.test(entry.hash)) {
                state.commit("regenEntryHash", entry);
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
            state.state.defaultEncryption,
          );
          if (!defaultEncryption) {
            throw new Error(
              "defaultEncryption is empty, this should never happen!",
            );
          }
          for (const entry of state.state.entries) {
            if (
              entry.encryption?.getEncryptionKeyId() !==
              state.state.defaultEncryption
            ) {
              state.commit("applyEntryEncryption", {
                entry,
                encryption: defaultEncryption,
              });
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

          useStyleStore().hideInfo(true);
          return;
        },
        changePassphrase: async (
          state: ActionContext<AccountsState, object>,
          password: string,
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
                "OldKey still being used. This should never happen!",
              );
            }
            const key: Key = {
              dataType: DataType.Key,
              id: crypto.randomUUID(),
              salt: salt,
              hash: hashOfHash,
              version: 3,
            };

            const linkedKeys = new Set<string>();
            for (const entry of state.state.entries) {
              state.commit("applyEntryEncryption", {
                entry,
                encryption: new Encryption(saltedHash, key.id),
              });
              // if not uuidv4 regen
              if (UUIDV4_REGEX.test(entry.hash)) {
                removeKeys.push(entry.hash);
                state.commit("regenEntryHash", entry);
              }

              if (entry.encryption?.getEncryptionKeyId()) {
                linkedKeys.add(entry.encryption.getEncryptionKeyId());
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

            state.commit("setEncryption", {
              keyId: key.id,
              encryption: new Encryption(saltedHash, key.id),
            });
            state.commit("setDefaultEncryption", key.id);

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
              state.commit("applyEntryEncryption", {
                entry,
                encryption: new Encryption("", ""),
              });
            }
            await EntryStorage.set(state.state.entries);

            await BrowserStorage.remove("key");
            const keyId = state.state.encryption
              .get(state.state.defaultEncryption)
              ?.getEncryptionKeyId();
            if (keyId) {
              await BrowserStorage.remove(keyId);
            }
            state.commit("setDefaultEncryption", "");

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
              const legacyEncryption =
                state.state.encryption.get(LegacyEncryption);
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

          // show the search box on load too, not only after clearing a smart
          // filter, so it appears for large lists / after unlocking (#1496, #1400)
          if (
            state.state.entries.length >= 10 &&
            !(state.getters.shouldFilter && state.state.filter)
          ) {
            state.commit("showSearch");
          }
          state.commit(
            "updateExport",
            await EntryStorage.getExport(state.state.entries),
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
          newStorageLocation: string,
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
                (value) => Object.keys(localData).indexOf(value) >= 0,
              )
            ) {
              UserSettings.items.storageLocation = StorageLocation.Local;
              await chrome.storage.sync.clear();
              // commitItems() strips functions and routes by storageLocation,
              // matching the local=>sync branch (was a raw local.set bypass).
              await UserSettings.commitItems();
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
                (value) => Object.keys(syncData).indexOf(value) >= 0,
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
    const { cachedPassphrase, cachedKeyId } = await chrome.storage.session.get([
      "cachedPassphrase",
      "cachedKeyId",
    ]);

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
    // zero-pad each 16-bit value to 4 hex chars; without padding leading zeros
    // were dropped, giving variable-length salts and collisions (e.g. 0x0001
    // and 0x0010 both contributing "1"/"10" ambiguously).
    salt += byte.toString(16).padStart(4, "0");
  }

  const hash = await argonHash(value, salt);
  if (!hash) {
    throw new Error("argon2 did not return a hash!");
  }
  return hash;
}
