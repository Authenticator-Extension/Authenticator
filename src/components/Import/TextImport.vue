<template>
  <div>
    <div class="import_code">
      <textarea spellcheck="false" v-model="importCode"></textarea>
    </div>
    <div class="import_encrypted">
      <input type="checkbox" id="encryptedCode" v-model="importEncrypted" />
      <label for="encryptedCode">{{ i18n.encrypted }}</label>
    </div>
    <div class="import_passphrase" v-show="importEncrypted">
      <label for="import_passphrase">{{ i18n.phrase }}</label>
      <input
        id="import_passphrase"
        type="password"
        v-model="importPassphrase"
      />
    </div>
    <button v-on:click="importBackupCode()">
      {{ i18n.import_backup_code }}
    </button>
  </div>
</template>
<script lang="ts">
import * as CryptoJS from "crypto-js";
import Vue from "vue";
import {
  decryptBackupData,
  getEntryDataFromOTPAuthPerLine
} from "../../import";
import { EntryStorage } from "../../models/storage";
import { Encryption } from "../../models/encryption";

export default Vue.extend({
  data: function() {
    return {
      importCode: "",
      importEncrypted: false,
      importPassphrase: ""
    };
  },
  methods: {
    async importBackupCode() {
      let exportData: {
        // @ts-ignore
        key?: { enc: string; hash: string };
        [hash: string]: OTPStorage;
      } = {};
      try {
        exportData = JSON.parse(this.importCode);
      } catch (error) {
        // Maybe one-otpauth-per line text
        exportData = await getEntryDataFromOTPAuthPerLine(this.importCode);
      }

      let key: { enc: string; hash: string } | null = null;

      if (exportData.key) {
        key = exportData.key;
        delete exportData.key;
      }

      try {
        const passphrase: string | null =
          this.importEncrypted && this.importPassphrase
            ? this.importPassphrase
            : null;
        let decryptedbackupData: {
          [hash: string]: OTPStorage;
        } = {};
        if (key && passphrase) {
          decryptedbackupData = decryptBackupData(
            exportData,
            CryptoJS.AES.decrypt(key.enc, passphrase).toString()
          );
        } else {
          decryptedbackupData = decryptBackupData(exportData, passphrase);
        }

        if (Object.keys(decryptedbackupData).length) {
          await EntryStorage.import(
            this.$encryption as Encryption,
            decryptedbackupData
          );
          alert(this.i18n.updateSuccess);
          window.close();
        } else {
          alert(this.i18n.updateFailure);
        }
        return;
      } catch (error) {
        throw error;
      }
    }
  }
});
</script>
