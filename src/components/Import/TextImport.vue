<template>
  <div>
    <div class="import_code">
      <textarea
        spellcheck="false"
        v-model="importCode"
        placeholder="otpauth://totp/...
otpauth://totp/...
otpauth://hotp/...
..."
      ></textarea>
    </div>
    <div class="import_encrypted">
      <input type="checkbox" id="encryptedCode" v-model="importEncrypted" />
      <label for="encryptedCode">{{ i18n.encrypted }}</label>
    </div>
    <div class="import_code_passphrase" v-show="importEncrypted">
      <label class="field-label">{{ i18n.phrase }}</label>
      <input class="pass-input" type="password" v-model="importPassphrase" />
    </div>
    <a-button @click="importBackupCode()">
      {{ i18n.import_backup_code }}
    </a-button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import {
  decryptBackupData,
  getEntryDataFromOTPAuthPerLine,
} from "../../import";
import { legacyDecryptToHex } from "../../models/legacy-decrypt";
import { EntryStorage } from "../../models/storage";
import { Encryption } from "../../models/encryption";

export default defineComponent({
  data: function () {
    return {
      importCode: "",
      importEncrypted: false,
      importPassphrase: "",
    };
  },
  methods: {
    async importBackupCode() {
      let exportData: {
        // @ts-ignore
        key?: { enc: string; hash: string };
        [hash: string]: OTPStorage | Key;
      } = {};
      let failedCount = 0;
      let succeededCount = 0;
      const content = this.importCode.trim();
      if (content.startsWith("otpauth")) {
        // otpauth:// per-line text, not JSON — parse directly so we don't
        // JSON.parse it and log a confusing "is not valid JSON" SyntaxError
        const result = await getEntryDataFromOTPAuthPerLine(content);
        exportData = result.exportData;
        failedCount = result.failedCount;
        succeededCount = result.succeededCount;
      } else {
        try {
          exportData = JSON.parse(content);
        } catch (error) {
          if (!(error instanceof SyntaxError)) {
            console.warn("Import:", error);
          }
          try {
            const result = await getEntryDataFromOTPAuthPerLine(content);
            exportData = result.exportData;
            failedCount = result.failedCount;
            succeededCount = result.succeededCount;
          } catch (_e) {
            // nothing parseable — exportData stays as {}
          }
        }
      }

      let key: { enc: string; hash: string } | null = null;

      if (exportData.hasOwnProperty("key")) {
        if (exportData.key) {
          key = exportData.key;
        }
        delete exportData.key;
      }

      const passphrase: string | null =
        this.importEncrypted && this.importPassphrase
          ? this.importPassphrase
          : null;
      let decryptedbackupData: {
        [hash: string]: RawOTPStorage;
      } = {};
      if (key && passphrase) {
        decryptedbackupData = await decryptBackupData(
          exportData,
          await legacyDecryptToHex(key.enc, passphrase),
        );
      } else {
        decryptedbackupData = await decryptBackupData(exportData, passphrase);
      }

      if (Object.keys(decryptedbackupData).length) {
        await EntryStorage.import(
          this.$encryption as Encryption,
          decryptedbackupData,
        );
        if (failedCount === 0) {
          alert(this.i18n.updateSuccess);
        } else if (succeededCount) {
          alert(this.i18n.import_backup_qr_partly_failed);
        } else {
          alert(this.i18n.updateFailure);
        }
        window.close();
      } else {
        alert(this.i18n.updateFailure);
      }
      return;
    },
  },
});
</script>
