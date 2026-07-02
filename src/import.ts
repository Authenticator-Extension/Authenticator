import { createApp } from "vue";
import ImportView from "./components/Import.vue";
import CommonComponents from "./components/common/index";
import { loadI18nMessages } from "./store/i18n";

import { Encryption, decryptString } from "./models/encryption";
import { EntryStorage } from "./models/storage";
import { getOTPAuthPerLineFromOPTAuthMigration } from "./models/migration";
import { argonHash, argonVerify } from "./models/password";

async function init() {
  try {
    const app = createApp(ImportView);
    // i18n
    app.config.globalProperties.i18n = await loadI18nMessages();

    // Load common components globally
    for (const component of CommonComponents) {
      app.component(component.name, component.component);
    }

    // Load entries to global
    const cachedSecrets = await getCachedSecrets();
    const encryption = new Encryption(
      cachedSecrets.cachedPassphrase,
      cachedSecrets.cachedKeyId
    );
    const entries = await EntryStorage.get();

    if (encryption.getEncryptionStatus()) {
      for (const entry of entries) {
        await entry.applyEncryption(encryption);
      }
    }

    app.config.globalProperties.$entries = entries;
    app.config.globalProperties.$encryption = encryption;

    const instance = app.mount("#import");

    // Set title
    try {
      document.title = instance.i18n.extName;
    } catch (e) {
      console.error(e);
    }
  } catch (e) {
    console.error("Import page init failed:", e);
  }
}

init();

async function getCachedSecrets() {
  const { cachedPassphrase, cachedKeyId } = await chrome.storage.session.get();

  return { cachedPassphrase, cachedKeyId };
}

export async function decryptBackupData(
  backupData: { [hash: string]: OTPStorage | Key },
  passphrase: string | null
) {
  const decryptedBackupData: { [hash: string]: RawOTPStorage } = {};
  const keys: Map<string, string | null> = new Map();
  for (const hash in backupData) {
    const unknownStorageItem = backupData[hash];
    if (
      typeof unknownStorageItem !== "object" ||
      unknownStorageItem.dataType === "Key"
    ) {
      continue;
    }
    let storageItem: RawOTPStorage;
    if (unknownStorageItem.dataType === "EncOTPStorage") {
      if (!passphrase) {
        continue;
      }

      if (!keys.has(unknownStorageItem.keyId)) {
        keys.set(
          unknownStorageItem.keyId,
          await findAndUnlockKey(
            backupData,
            unknownStorageItem.keyId,
            passphrase
          )
        );
      }
      const decryptKey = keys.get(unknownStorageItem.keyId);
      if (!decryptKey) {
        // wrong password for key
        continue;
      }

      // decryptString is prefix-aware (new AES-GCM or legacy AES-CBC backups)
      const decryptedJson = await decryptString(
        unknownStorageItem.data,
        decryptKey
      );
      if (!decryptedJson) {
        // a single corrupt/undecryptable entry must not abort the whole import
        continue;
      }
      let decryptedData;
      try {
        decryptedData = JSON.parse(decryptedJson);
      } catch {
        continue;
      }
      storageItem = {
        ...unknownStorageItem,
        ...decryptedData,
        encrypted: false,
      };
    } else {
      storageItem = unknownStorageItem;
    }
    if (!storageItem.secret) {
      continue;
    }
    if (storageItem.encrypted && !passphrase) {
      continue;
    }
    if (storageItem.encrypted && passphrase) {
      const decryptedSecret = await decryptString(
        storageItem.secret,
        passphrase
      );
      if (!decryptedSecret) {
        continue;
      }
      storageItem.secret = decryptedSecret;
      storageItem.encrypted = false;
    }
    // storageItem.secret may be empty after decrypt with wrong
    // passphrase
    if (!storageItem.secret) {
      continue;
    }
    decryptedBackupData[hash] = storageItem;
  }
  return decryptedBackupData;
}

async function findAndUnlockKey(
  importData: { [key: string]: OTPStorage | Key },
  keyId: string,
  password: string
): Promise<string | null> {
  if (!(keyId in importData)) {
    return null;
  }

  const key = importData[keyId];
  if (key.dataType !== "Key" || key.id !== keyId) {
    return null;
  }

  const rawHash = await argonHash(password, key.salt);

  // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
  const possibleHash = rawHash ? rawHash.split("$")[5] : "";
  if (!possibleHash) {
    throw new Error("argon2 did not return a hash!");
  }

  // verify user password by comparing their password hash with the
  // hash of their password's hash
  const isCorrectPassword = await argonVerify(possibleHash, key.hash);

  if (!isCorrectPassword) {
    return null;
  }

  return possibleHash;
}

export async function getEntryDataFromOTPAuthPerLine(importCode: string) {
  const lines = importCode.split("\n");
  const exportData: { [hash: string]: RawOTPStorage } = {};
  let failedCount = 0;
  let succeededCount = 0;
  for (let item of lines) {
    item = item.trim();
    if (item.startsWith("otpauth-migration:")) {
      let migrationData: string[] = [];
      try {
        migrationData = getOTPAuthPerLineFromOPTAuthMigration(item);
      } catch (error) {
        // one malformed migration payload must not abort the whole batch
        console.warn("Failed to parse migration payload", error);
      }
      for (const line of migrationData) {
        lines.push(line);
      }
      continue;
    }
    if (!item.startsWith("otpauth:")) {
      continue;
    }

    // "otpauth://" is not a special scheme in the WHATWG URL Standard, so
    // browsers are NOT required to (and in practice don't consistently)
    // parse the "//type/label" part into url.host/url.pathname — Chrome 126
    // leaves url.host empty and dumps everything into pathname, while Node's
    // URL parses host as "type". Only the "?query" part is parsed reliably
    // everywhere, so the type/label split stays manual and only parameter
    // parsing below is upgraded to URLSearchParams.
    const afterScheme = item.split("otpauth://")[1];
    if (!afterScheme) {
      // malformed URI (e.g. missing "//") must not abort the batch
      failedCount++;
      continue;
    }
    let type = afterScheme.substr(0, 4).toLowerCase();
    const rest = afterScheme.substr(5);
    let label = rest.split("?")[0];
    const parameterPart = rest.split("?")[1];
    if (!parameterPart) {
      failedCount++;
      continue;
    } else {
      const params = new URLSearchParams(parameterPart);
      let secret = "";
      let account: string | undefined;
      let issuer: string | undefined;
      let algorithm: string | undefined;
      let period: number | undefined;
      let digits: number | undefined;

      try {
        label = decodeURIComponent(label);
      } catch (error) {
        console.error(error);
      }
      if (label.indexOf(":") !== -1) {
        issuer = label.split(":")[0];
        account = label.split(":")[1];
      } else {
        account = label;
      }

      // secret must be read as the raw parameter value: URLSearchParams
      // already decodes "+" as a space for every field, which matches the
      // old manual issuer handling but NOT the old secret handling (the old
      // code never unescaped "+" in secret). Base32/hex secrets never
      // contain "+", so this only matters for malformed input, which falls
      // through to the format check below and is rejected the same way.
      secret = params.get("secret") || "";
      if (params.has("issuer")) {
        // URLSearchParams already decodes "+" as a space, matching the old
        // manual decodeURIComponent + replace(/\+/g, " ") behavior.
        issuer = params.get("issuer") || "";
      }
      /* counter is intentionally not parsed here, matching prior behavior */
      if (params.has("period")) {
        period = Number(params.get("period"));
        // accept any positive integer period; the old "> 60" / "60 % period"
        // checks silently dropped valid periods (45, 60, 90, 120...) so those
        // OTPs fell back to 30s and produced wrong codes (#1271, #1508)
        period = !Number.isInteger(period) || period < 1 ? undefined : period;
      }
      if (params.has("digits")) {
        digits = Number(params.get("digits"));
        digits = isNaN(digits) ? 6 : digits;
      }
      if (params.has("algorithm")) {
        algorithm = params.get("algorithm") || undefined;
      }

      if (!secret) {
        failedCount++;
        continue;
      } else if (
        !/^[0-9a-f]+$/i.test(secret) &&
        !/^[2-7a-z]+=*$/i.test(secret)
      ) {
        failedCount++;
        continue;
      } else {
        const hash = crypto.randomUUID();
        if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "totp"
        ) {
          type = "hex";
        } else if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "hotp"
        ) {
          type = "hhex";
        }

        exportData[hash] = {
          account,
          hash,
          issuer,
          secret,
          type,
          encrypted: false,
          index: 0,
          counter: 0,
          pinned: false,
        };
        if (period) {
          exportData[hash].period = period;
        }
        if (digits) {
          exportData[hash].digits = digits;
        }
        if (algorithm) {
          exportData[hash].algorithm = algorithm;
        }

        succeededCount++;
      }
    }
  }

  return { exportData, failedCount, succeededCount };
}
