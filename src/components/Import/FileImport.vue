<template>
  <div>
    <div class="import_file" v-if="!getFilePassphrase">
      <label for="import_file">{{ i18n.import_backup_file }}</label>
      <input
        id="import_file"
        type="file"
        v-on:change="importFile($event, true)"
        accept="application/json, text/plain"
      />
    </div>
    <div class="import_file_passphrase" v-else>
      <p class="error_password">{{ i18n.passphrase_info }}</p>
      <div class="import_file_passphrase_input">
        <label style="text-align: left;">{{ i18n.phrase }}</label>
        <!-- trigger here -->
        <input
          type="password"
          v-on:keyup.enter="readFilePassphrase = true"
          v-model="importFilePassphrase"
        />
      </div>
      <!-- trigger here -->
      <button v-on:click="readFilePassphrase = true">{{ i18n.ok }}</button>
    </div>
  </div>
</template>
<script lang="ts">
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
      getFilePassphrase: false,
      readFilePassphrase: false,
      importFilePassphrase: ""
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
        let decryptedFileData: { [hash: string]: OTPStorage } = {};
        reader.onload = async () => {
          let importData: { [hash: string]: OTPStorage } = {};
          try {
            importData = JSON.parse(reader.result as string);
          } catch (e) {
            importData = getEntryDataFromOTPAuthPerLine(
              reader.result as string
            );
          }

          let encrypted = false;
          for (const hash in importData) {
            if (importData[hash].encrypted) {
              encrypted = true;
              try {
                const oldPassphrase:
                  | string
                  | null = await this.getOldPassphrase();
                decryptedFileData = decryptBackupData(
                  importData,
                  oldPassphrase
                );
                break;
              } catch {
                break;
              }
            }
          }
          if (!encrypted) {
            decryptedFileData = importData;
          }
          if (Object.keys(decryptedFileData).length) {
            await EntryStorage.import(
              this.$encryption as Encryption,
              decryptedFileData
            );
            alert(this.i18n.updateSuccess);
            if (closeWindow) {
              window.close();
            }
          } else {
            alert(this.i18n.updateFailure);
            this.getFilePassphrase = false;
            this.importFilePassphrase = "";
          }
        };
        reader.readAsText(target.files[0], "utf8");
      } else {
        alert(this.i18n.updateFailure);
        if (closeWindow) {
          window.alert(this.i18n.updateFailure);
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
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return this.importFilePassphrase;
    }
  }
});
</script>
