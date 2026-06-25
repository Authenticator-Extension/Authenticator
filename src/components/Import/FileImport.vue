<template>
  <div class="file-import">
    <!-- Dropzone -->
    <template v-if="!getFilePassphrase">
      <label class="dropzone" @dragover.prevent @drop.prevent="dropFile">
        <input
          type="file"
          accept="application/json, text/plain"
          @change="importFile($event, true)"
        />
        <div class="dropzone-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v12"></path>
            <polyline points="7 8 12 3 17 8"></polyline>
            <path d="M5 21h14"></path>
          </svg>
        </div>
        <div class="dropzone-text">
          <div class="dropzone-title">{{ i18n.import_drop_file }}</div>
          <div class="dropzone-hint">{{ i18n.import_file_accepts }}</div>
        </div>
        <span class="dropzone-btn">{{ i18n.import_choose_file }}</span>
      </label>
      <div class="import-note">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
          <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
        </svg>
        <div>{{ i18n.import_encrypted_note }}</div>
      </div>
    </template>

    <!-- Encrypted file picked → passphrase -->
    <template v-else>
      <div class="file-card">
        <div class="file-card-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 3v5h5"></path>
            <path
              d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z"
            ></path>
          </svg>
        </div>
        <div class="file-card-text">
          <div class="file-card-name">{{ fileName }}</div>
          <div class="file-card-badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
              <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
            </svg>
            {{ i18n.import_enc_required }}
          </div>
        </div>
        <div
          class="file-card-remove"
          role="button"
          tabindex="0"
          v-on:click="resetFile()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18"></line>
            <line x1="18" y1="6" x2="6" y2="18"></line>
          </svg>
        </div>
      </div>
      <label class="field-label">{{ i18n.phrase }}</label>
      <input
        class="pass-input"
        type="password"
        v-model="importFilePassphrase"
        v-bind:placeholder="i18n.import_pass_placeholder"
        v-on:keyup.enter="readFilePassphrase = true"
      />
      <div class="pass-hint">{{ i18n.import_pass_hint }}</div>
      <button class="pass-submit" v-on:click="readFilePassphrase = true">
        {{ i18n.import_decrypt }}
      </button>
    </template>
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
      fileName: "",
      cancelImport: false,
    };
  },
  methods: {
    resetFile() {
      // back out of the passphrase prompt and abort the pending read
      this.cancelImport = true;
      this.getFilePassphrase = false;
      this.readFilePassphrase = false;
      this.importFilePassphrase = "";
      this.fileName = "";
    },
    dropFile(event: DragEvent) {
      const files = event.dataTransfer?.files;
      if (files && files[0]) {
        // a dropped file lives on dataTransfer; importFile only reads
        // event.target.files, so hand it a shimmed event and reuse it.
        this.importFile(({ target: { files } } as unknown) as Event, true);
      }
    },
    importFile(event: Event, closeWindow: Boolean) {
      const target = event.target as HTMLInputElement;
      if (!target || !target.files) {
        return;
      }
      if (target.files[0]) {
        this.cancelImport = false;
        this.fileName = target.files[0].name;
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
            // user backed out of the passphrase prompt — abort quietly
            if (this.cancelImport) {
              this.cancelImport = false;
              return;
            }
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
        if (this.cancelImport) {
          throw new Error("import cancelled");
        }
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
