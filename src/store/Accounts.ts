import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { EntryStorage, BrowserStorage, isOldKey } from "../models/storage";
import { Encryption } from "../models/encryption";
import { legacyDecryptToHex } from "../models/legacy-decrypt";
import { OTPType, OTPAlgorithm } from "../models/otp";
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

async function getCachedKeyInfo() {
  const { cachedPassphrase, cachedKeyId } = await chrome.storage.session.get([
    "cachedPassphrase",
    "cachedKeyId",
  ]);

  return { cachedPassphrase, cachedKeyId };
}

async function getEntries() {
  const otpEntries = await EntryStorage.get();
  return otpEntries;
}

// EntryStorage.getExport's catch clause returns `unknown`; on the success path
// it resolves to the export map. Narrow it here so callers get a typed result
// (the old Vuex store absorbed this via its `any`-typed state).
async function getTypedExport(
  data: OTPEntryInterface[],
  encrypted?: boolean,
): Promise<{ [hash: string]: OTPStorage }> {
  return (await EntryStorage.getExport(data, encrypted)) as {
    [hash: string]: OTPStorage;
  };
}

export const useAccountsStore = defineStore("accounts", () => {
  // --- state (synchronous defaults; async values are filled in by init())
  const entries = ref<OTPEntryInterface[]>([]);
  const encryption = ref<Map<string, EncryptionInterface>>(new Map());
  const defaultEncryption = ref("");
  // OTP type/algorithm enums are exposed as state so components can bind the
  // add-account dropdowns to them (they never change at runtime).
  const OTPTypeState = ref(OTPType);
  const OTPAlgorithmState = ref(OTPAlgorithm);
  const shouldShowPassphrase = ref(false);
  const sectorStart = ref(false); // Should display timer circles?
  const sectorOffset = ref(0); // Offset in seconds for animations
  const second = ref(0); // Offset in seconds for math
  const filter = ref(true);
  const siteName = ref<(string | null)[]>([]);
  const showSearch = ref(false);
  // getExport returns { [hash]: OTPStorage }; the encrypted variant is merged
  // with Key entries in updateEncExport, hence the wider value type.
  const exportData = ref<{ [hash: string]: OTPStorage }>({});
  const exportEncData = ref<{ [hash: string]: OTPStorage | Key }>({});
  const keys = ref<OldKey | Key[]>([]);
  const wrongPassword = ref(false);
  const initComplete = ref(false);

  // Populates async state from storage; the caller must await this before the
  // popup mounts so components never observe the pre-init defaults above.
  async function init() {
    const cachedKeyInfo = await getCachedKeyInfo();
    if (cachedKeyInfo.cachedKeyId) {
      encryption.value.set(
        cachedKeyInfo.cachedKeyId as string,
        new Encryption(
          cachedKeyInfo.cachedPassphrase as string,
          cachedKeyInfo.cachedKeyId as string,
        ),
      );
    }

    shouldShowPassphrase.value = await EntryStorage.hasEncryptionKey();
    const initialEntries = shouldShowPassphrase.value ? [] : await getEntries();
    entries.value = initialEntries;
    defaultEncryption.value = (cachedKeyInfo.cachedKeyId as string) || "";

    await UserSettings.updateItems();

    siteName.value = await getSiteName();
    exportData.value = await getTypedExport(initialEntries);
    exportEncData.value = await getTypedExport(initialEntries, true);
    keys.value = await BrowserStorage.getKeys();
  }

  // --- getters
  const matchedEntries = computed(() => {
    return getMatchedEntriesHash(siteName.value, entries.value);
  });

  const shouldFilter = computed(() => {
    // getMatchedEntriesHash returns string[] | false; the old Vuex getter hid
    // the `false` via a manual string[] annotation. Guard it — `false` and a
    // zero-length array are both falsy, matching the original truthiness.
    const matched = matchedEntries.value;
    return (
      UserSettings.items.smartFilter === true &&
      matched !== false &&
      matched.length
    );
  });

  const currentlyEncrypted = computed(() => {
    for (const entry of entries.value) {
      if (entry.secret === null) {
        return true;
      }
    }
    return false;
  });

  // Pinned-first display order (was the Vuex "entries" getter; renamed to avoid
  // colliding with the raw `entries` state ref in the single Pinia namespace).
  const sortedEntries = computed(() => {
    const pinnedEntries = entries.value.filter((entry) => entry.pinned);
    const unpinnedEntries = entries.value.filter((entry) => !entry.pinned);
    return [...pinnedEntries, ...unpinnedEntries];
  });

  // --- internal state helpers (former Vuex mutations; kept private because no
  // component/popup.ts calls them directly — only the actions below do)
  function loadCodes(newCodes: OTPEntryInterface[]) {
    entries.value = newCodes;
  }

  function updateExport(data: { [hash: string]: OTPStorage }) {
    exportData.value = data;
  }

  function updateEncExport(data: {
    entries: { [hash: string]: OTPStorage };
    keys: Key[] | OldKey;
  }) {
    if (isOldKey(data.keys)) {
      return;
    }

    const newKeys = data.keys.reduce((prev: { [id: string]: Key }, key) => {
      prev[key.id] = key;
      return prev;
    }, {});
    exportEncData.value = { ...data.entries, ...newKeys };
  }

  function setWrongPassword() {
    wrongPassword.value = true;
  }

  function removeEntry(hash: string) {
    const index = entries.value.findIndex((entry) => entry.hash === hash);
    if (index > -1) {
      entries.value.splice(index, 1);
    }
  }

  function addEntry(entry: OTPEntryInterface) {
    entries.value.unshift(entry);
  }

  function setDefaultEncryption(keyId: string) {
    defaultEncryption.value = keyId;
  }

  function setEncryption(payload: {
    keyId: string;
    encryption: EncryptionInterface;
  }) {
    encryption.value.set(payload.keyId, payload.encryption);
  }

  function applyEntryEncryption(payload: {
    entry: OTPEntryInterface;
    encryption: EncryptionInterface;
  }) {
    payload.entry.changeEncryption(payload.encryption);
  }

  function regenEntryHash(entry: OTPEntryInterface) {
    entry.genUUID();
  }

  // --- state helpers called from components/popup.ts (exposed below)
  function stopFilter() {
    filter.value = false;
  }

  function startFilter() {
    filter.value = true;
  }

  function setShowSearch() {
    showSearch.value = true;
  }

  function setInitComplete() {
    initComplete.value = true;
  }

  function updateCodes() {
    let sec = new Date().getSeconds();
    if (UserSettings.items.offset) {
      sec += Number(UserSettings.items.offset);
    }

    // positive modulo so any offset (incl. < -60) stays in 0..59 (#1310)
    sec = ((sec % 60) + 60) % 60;
    second.value = sec;

    let entriesEncrypted = false;

    for (const entry of entries.value) {
      if (entry.secret === null) {
        entriesEncrypted = true;
      }
    }

    if (!sectorStart.value && entries.value.length > 0 && !entriesEncrypted) {
      sectorStart.value = true;
      sectorOffset.value = -sec;
    }

    for (const entry of entries.value) {
      if (entry.type !== OTPType.hotp && entry.type !== OTPType.hhex) {
        entry.generate();
      }
    }
  }

  // vuedraggable hands back the reordered (pinned-first) displayed array;
  // re-index by position and store it. The `sortedEntries` getter re-derives
  // the pinned-first view from this, so drags within a group stick.
  function reorderEntries(reordered: OTPEntryInterface[]) {
    reordered.forEach((entry, i) => {
      entry.index = i;
    });
    entries.value = reordered;
  }

  function pinEntry(entry: OTPEntryInterface) {
    entries.value[entry.index].pinned = !entry.pinned;
  }

  // Re-anchor the timer-circle animation phase to the current second.
  // Reordering (pin/drag) re-attaches the entry's DOM node, which restarts
  // its CSS animation; without re-syncing it would resume from the stale
  // load-time sectorOffset and the countdown circle would drift until the
  // popup is reopened.
  function resyncSector() {
    sectorOffset.value = -second.value;
  }

  function setEntryField(payload: {
    entry: OTPEntryInterface;
    field: "issuer" | "account" | "host";
    value: string;
  }) {
    payload.entry[payload.field] = payload.value;
  }

  // in-memory part of OTPEntry.next(); persistence (entry.update()) stays
  // in the caller since this only touches in-memory state
  function advanceHotpCounter(entry: OTPEntryInterface) {
    entry.generate();
    if (entry.secret !== null) {
      entry.counter++;
    }
  }

  // --- actions (former Vuex actions; commit/dispatch calls become direct
  // function calls, state/getters reads become ref .value / computed .value)
  async function deleteCode(hash: string) {
    removeEntry(hash);
    updateExport(await getTypedExport(entries.value));
    updateEncExport({
      entries: await getTypedExport(entries.value, true),
      keys: await BrowserStorage.getKeys(),
    });
  }

  async function addCode(entry: OTPEntryInterface) {
    addEntry(entry);
    updateExport(await getTypedExport(entries.value));
    updateEncExport({
      entries: await getTypedExport(entries.value, true),
      keys: await BrowserStorage.getKeys(),
    });
  }

  async function applyPassphrase(password: string) {
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
      const key = await legacyDecryptToHex(encKeys.enc, password);
      const isCorrectPassword = await argonVerify(key, encKeys.hash);

      if (!isCorrectPassword) {
        setWrongPassword();
        useCurrentViewStore().changeView("EnterPasswordPage");
        return;
      }

      setEncryption({
        keyId: LegacyEncryption,
        encryption: new Encryption(key, LegacyEncryption),
      });

      migrationNeeded = true;
    } else if (encKeys.length === 0) {
      // --- handle v1 encryption
      // verify current password
      setEncryption({
        keyId: LegacyEncryption,
        encryption: new Encryption(password, LegacyEncryption),
      });
      await updateEntries();

      if (currentlyEncrypted.value) {
        setWrongPassword();
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
        const isCorrectPassword = await argonVerify(possibleHash, key.hash);

        // TODO: there is a serious bug here. If two keys have the same password,
        // then only one of them will be used for decryption.
        if (isCorrectPassword) {
          setEncryption({
            keyId: key.id,
            encryption: new Encryption(possibleHash, key.id),
          });
          setDefaultEncryption(key.id);

          saltedHash = possibleHash;
        }
      }

      await updateEntries();

      if (!saltedHash) {
        setWrongPassword();
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
      setEncryption({
        keyId: key.id,
        encryption: newEncryption,
      });
      setDefaultEncryption(key.id);

      const toRemove: string[] = [];
      for (const entry of entries.value) {
        if (!entry.secret) {
          continue;
        }

        applyEntryEncryption({
          entry,
          encryption: newEncryption,
        });

        // if not uuidv4 regen
        if (UUIDV4_REGEX.test(entry.hash)) {
          regenEntryHash(entry);
          toRemove.push(entry.hash);
        }
      }

      // store key
      await BrowserStorage.set({
        [key.id]: key,
      });
      await EntryStorage.set(entries.value);
      await BrowserStorage.remove(toRemove);
      await BrowserStorage.remove("key");

      await updateEntries();
    }

    if (!saltedHash) {
      throw new Error("Empty saltedHash! This should never happen.");
    }

    // Encrypt any unencrypted entries.
    // Browser sync can cause unencrypted entries to show up.
    let needUpdateStorage = false;
    const defaultEncryptionInstance = encryption.value.get(
      defaultEncryption.value,
    );
    if (!defaultEncryptionInstance) {
      throw new Error("defaultEncryption is empty, this should never happen!");
    }
    for (const entry of entries.value) {
      if (entry.encryption?.getEncryptionKeyId() !== defaultEncryption.value) {
        applyEntryEncryption({
          entry,
          encryption: defaultEncryptionInstance,
        });
        needUpdateStorage = true;
      }
    }

    if (needUpdateStorage) {
      await EntryStorage.set(entries.value);
      await updateEntries();
    }

    if (!currentlyEncrypted.value) {
      chrome.runtime.sendMessage({
        action: "cachePassphrase",
        value: saltedHash,
        keyId: defaultEncryptionInstance.getEncryptionKeyId(),
      });
    }

    useStyleStore().hideInfo(true);
    return;
  }

  async function changePassphrase(password: string) {
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
      const keyList = await BrowserStorage.getKeys();
      if (isOldKey(keyList)) {
        throw new Error("OldKey still being used. This should never happen!");
      }
      const key: Key = {
        dataType: DataType.Key,
        id: crypto.randomUUID(),
        salt: salt,
        hash: hashOfHash,
        version: 3,
      };

      const linkedKeys = new Set<string>();
      for (const entry of entries.value) {
        applyEntryEncryption({
          entry,
          encryption: new Encryption(saltedHash, key.id),
        });
        // if not uuidv4 regen
        if (UUIDV4_REGEX.test(entry.hash)) {
          removeKeys.push(entry.hash);
          regenEntryHash(entry);
        }

        if (entry.encryption?.getEncryptionKeyId()) {
          linkedKeys.add(entry.encryption.getEncryptionKeyId());
        }
      }

      // store key
      await BrowserStorage.set({
        [key.id]: key,
      });
      await EntryStorage.set(entries.value);
      // remove unlinked keys when there is at least one entry
      if (entries.value.length !== 0) {
        for (const storedKey of keyList) {
          if (!linkedKeys.has(storedKey.id)) {
            removeKeys.push(storedKey.id);
          }
        }
      }
      if (removeKeys.length) {
        await BrowserStorage.remove(removeKeys);
      }

      setEncryption({
        keyId: key.id,
        encryption: new Encryption(saltedHash, key.id),
      });
      setDefaultEncryption(key.id);

      await updateEntries();

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
      for (const entry of entries.value) {
        applyEntryEncryption({
          entry,
          encryption: new Encryption("", ""),
        });
      }
      await EntryStorage.set(entries.value);

      await BrowserStorage.remove("key");
      const keyId = encryption.value
        .get(defaultEncryption.value)
        ?.getEncryptionKeyId();
      if (keyId) {
        await BrowserStorage.remove(keyId);
      }
      setDefaultEncryption("");

      await updateEntries();

      chrome.runtime.sendMessage({
        action: "lock",
      });
    }

    // remove cached passphrase in old version
    UserSettings.items.encodedPhrase = undefined;
    await UserSettings.removeItem("encodedPhrase");
  }

  async function updateEntries() {
    const newEntries = await getEntries();

    for (const entry of newEntries) {
      // LegacyEncryption indicates that we need to use backwards compatibility logic
      if (entry.encSecret) {
        const legacyEncryption = encryption.value.get(LegacyEncryption);
        if (legacyEncryption) {
          await entry.applyEncryption(legacyEncryption);
        }
      } else if (entry.keyId) {
        const entryEncryption = encryption.value.get(entry.keyId);
        if (entryEncryption) {
          await entry.applyEncryption(entryEncryption);
        }
      }
    }

    loadCodes(newEntries);
    updateCodes();

    // show the search box on load too, not only after clearing a smart
    // filter, so it appears for large lists / after unlocking (#1496, #1400)
    if (entries.value.length >= 10 && !(shouldFilter.value && filter.value)) {
      setShowSearch();
    }
    updateExport(await getTypedExport(entries.value));
    updateEncExport({
      entries: await getTypedExport(entries.value, true),
      keys: await BrowserStorage.getKeys(),
    });
    setInitComplete();
    return;
  }

  function clearFilter() {
    stopFilter();
    if (entries.value.length >= 10) {
      setShowSearch();
    }
  }

  async function migrateStorage(newStorageLocation: string) {
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
  }

  return {
    // state
    entries,
    encryption,
    defaultEncryption,
    OTPType: OTPTypeState,
    OTPAlgorithm: OTPAlgorithmState,
    shouldShowPassphrase,
    sectorStart,
    sectorOffset,
    second,
    filter,
    siteName,
    showSearch,
    exportData,
    exportEncData,
    keys,
    wrongPassword,
    initComplete,
    // getters
    matchedEntries,
    shouldFilter,
    currentlyEncrypted,
    sortedEntries,
    // actions (incl. externally-called state helpers)
    init,
    stopFilter,
    startFilter,
    setShowSearch,
    setInitComplete,
    updateCodes,
    reorderEntries,
    pinEntry,
    resyncSector,
    setEntryField,
    advanceHotpCounter,
    deleteCode,
    addCode,
    applyPassphrase,
    changePassphrase,
    updateEntries,
    clearFilter,
    migrateStorage,
  };
});

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
