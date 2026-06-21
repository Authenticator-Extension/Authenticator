<template>
  <div>
    <a-file-input
      button-type="file"
      accept="application/json, text/plain"
      v-if="!getFilePassphrase"
      @change="importFile($event, true)"
      :label="i18n.import_backup_file"
    />
    <div class="import_file_passphrase" v-else>
      <p class="error_password">{{ i18n.passphrase_info }}</p>
      <a-text-input
        :label="i18n.phrase"
        type="password"
        @enter="readFilePassphrase = true"
        v-model="importFilePassphrase"
      />
      <a-button @click="readFilePassphrase = true">{{ i18n.ok }}</a-button>
    </div>
  </div>
</template>
<script lang="ts">
import * as CryptoJS from "crypto-js";
import { defineComponent } from "vue";
import {
  decryptBackupData,
  getEntryDataFromOTPAuthPerLine,
} from "../../import";
import { EntryStorage } from "../../models/storage";
import { Encryption } from "../../models/encryption";

export default defineComponent({
  data: function () {
    return {
      getFilePassphrase: false,
      readFilePassphrase: false,
      importFilePassphrase: "",
    };
  },
  methods: {
    importFile(event: Event, closeWindow: Boolean) {
      const target = event.target as HTMLInputElement;
      if (!target || !target.files) {
        return;
      }
      if (target.files[0]) {
        const reader = new FileReader();
        let decryptedFileData: { [hash: string]: RawOTPStorage } = {};
        reader.onload = async () => {
          let importData: {
            // @ts-ignore
            key?: { enc: string; hash: string };
            [hash: string]: RawOTPStorage | Key;
            // Bug #557, uploaded backups were missing `key`
            // @ts-ignore
            enc?: string;
            // @ts-ignore
            hash?: string;
          } = {};
          let failedCount = 0;
          let succeededCount = 0;
          const content = (reader.result as string).trim();
          if (content.startsWith("otpauth")) {
            // otpauth:// or otpauth-migration:// text backup (not JSON) — parse
            // it directly so we don't JSON.parse it and log a confusing
            // "otpauth:// is not valid JSON" SyntaxError
            const result = await getEntryDataFromOTPAuthPerLine(content);
            importData = result.exportData;
            failedCount = result.failedCount;
            succeededCount = result.succeededCount;
          } else {
            try {
              importData = JSON.parse(content);
              // andOTP exports a flat JSON array instead of a keyed object (#1304)
              if (Array.isArray(importData)) {
                importData = getEntryDataFromAndOTP(importData);
              }
              succeededCount = Object.keys(importData).filter(
                (key) => ["key", "enc", "hash"].indexOf(key) === -1
              ).length;
            } catch (e) {
              console.warn(e);
              const result = await getEntryDataFromOTPAuthPerLine(content);
              importData = result.exportData;
              failedCount = result.failedCount;
              succeededCount = result.succeededCount;
            }
          }

          let key: { enc: string } | null = null;

          if (importData.hasOwnProperty("key")) {
            if (importData.key) {
              key = importData.key;
            }
            delete importData.key;
          } else if (importData.enc && importData.hash) {
            key = { enc: importData.enc };
            delete importData.hash;
            delete importData.enc;
          }

          for (const hash in importData) {
            const possibleEntry = importData[hash];
            if (possibleEntry.dataType === "Key") {
              // don't try to import keys as an OTPEntry
              continue;
            }

            if (possibleEntry.keyId || possibleEntry.encrypted) {
              try {
                const oldPassphrase:
                  | string
                  | null = await this.getOldPassphrase();

                if (key) {
                  // v2 encryption
                  decryptedFileData = await decryptBackupData(
                    importData,
                    CryptoJS.AES.decrypt(key.enc, oldPassphrase).toString()
                  );
                } else {
                  // v3 and v1 encryption
                  decryptedFileData = await decryptBackupData(
                    importData,
                    oldPassphrase
                  );
                }

                break;
              } catch {
                break;
              }
            } else {
              decryptedFileData[hash] = possibleEntry;
            }
          }
          if (Object.keys(decryptedFileData).length) {
            await EntryStorage.import(
              this.$encryption as Encryption,
              decryptedFileData
            );
            if (failedCount === 0) {
              alert(this.i18n.updateSuccess);
            } else if (succeededCount) {
              alert(this.i18n.migration_partly_fail);
            } else {
              alert(this.i18n.migration_fail);
            }

            if (closeWindow) {
              window.close();
            }
          } else {
            alert(this.i18n.migration_fail);
            this.getFilePassphrase = false;
            this.importFilePassphrase = "";
          }
        };
        reader.readAsText(target.files[0], "utf8");
      } else {
        alert(this.i18n.migration_fail);
        if (closeWindow) {
          window.close();
        }
      }
      return;
    },
    async getOldPassphrase() {
      this.getFilePassphrase = true;
      while (true) {
        if (this.readFilePassphrase) {
          if (this.importFilePassphrase) {
            this.readFilePassphrase = false;
            break;
          } else {
            this.readFilePassphrase = false;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return this.importFilePassphrase;
    },
  },
});

interface AndOTPEntry {
  secret: string;
  issuer?: string;
  label?: string;
  digits?: number;
  type?: string;
  algorithm?: string;
  period?: number;
  counter?: number;
}

// Convert an andOTP plain-JSON export (array of entries) into the keyed
// RawOTPStorage map the importer expects. EntryStorage.import normalises the
// type/algorithm names, so we just need the right field names and lower-cased
// type (andOTP uses "TOTP"/"HOTP"/"STEAM"). #1304
function getEntryDataFromAndOTP(entries: AndOTPEntry[]) {
  const data: { [hash: string]: RawOTPStorage } = {};
  for (const entry of entries) {
    if (!entry || !entry.secret) {
      continue;
    }
    const hash = crypto.randomUUID();
    const issuer = entry.issuer || "";
    let account = entry.label || "";
    // andOTP labels are often "Issuer:account"; drop the redundant prefix
    if (issuer && account.startsWith(issuer + ":")) {
      account = account.slice(issuer.length + 1);
    }
    data[hash] = {
      account,
      issuer,
      secret: entry.secret,
      type: (entry.type || "totp").toLowerCase(),
      encrypted: false,
      index: 0,
      hash,
      counter: entry.counter || 0,
      period: entry.period || 30,
      digits: entry.digits || 6,
      algorithm: entry.algorithm || "SHA1",
      pinned: false,
    };
  }
  return data;
}
</script>
