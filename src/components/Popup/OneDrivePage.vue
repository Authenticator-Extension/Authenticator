<template>
  <div>
    <div>
      <div
        class="text warning"
        v-show="!isEncrypted || !encryption.getEncryptionStatus()"
      >
        {{ i18n.dropbox_risk }}
      </div>
      <div v-show="backupToken">
        <div style="margin: 10px 0px 0px 20px; overflow-wrap: break-word">
          {{ i18n.account }} - {{ email }}
        </div>
      </div>
      <a-select-input
        v-show="encryption.getEncryptionStatus() && backupToken"
        :label="i18n.encrypted"
        v-model="isEncrypted"
      >
        <option value="true">{{ i18n.yes }}</option>
        <option value="false">{{ i18n.no }}</option>
      </a-select-input>
      <a-button v-show="backupToken" @click="backupLogout()">
        {{ i18n.log_out }}
      </a-button>
      <a-button v-show="!backupToken" @click="getBackupToken()">
        {{ i18n.sign_in }}
      </a-button>
      <a-button v-show="!backupToken" @click="getBackupToken(true)">
        {{ i18n.sign_in_business }}
      </a-button>
      <div class="text" v-show="!backupToken">
        <a
          v-on:click="openLink('https://otp.ee/onedriveperms')"
          href="https://otp.ee/onedriveperms"
          >{{ i18n.onedrive_business_perms }}</a
        >
      </div>
      <a-button v-show="backupToken" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { OneDrive } from "../../models/backup";

const service = "onedrive";

export default Vue.extend({
  data: function () {
    return {
      email: this.i18n.loading,
      LocalStorage: {} as { [key: string]: any },
    };
  },
  created() {
    chrome.storage.local.get("LocalStorage").then((res) => {
      this.LocalStorage = res.LocalStorage || {};
    });
  },
  computed: {
    encryption: function () {
      return this.$store.state.accounts.encryption;
    },
    isEncrypted: {
      get(): boolean {
        if (this.LocalStorage[`oneDriveEncrypted`] === null) {
          this.$store.commit("backup/setEnc", { service, value: true });
          this.LocalStorage.oneDriveEncrypted = true;
          chrome.storage.local.set({ LocalStorage: this.LocalStorage });
          return true;
        }
        return this.$store.state.backup.driveEncrypted;
      },
      set(newValue: string) {
        this.LocalStorage.driveEncrypted = newValue;
        chrome.storage.local.set({ LocalStorage: this.LocalStorage });
        this.$store.commit("backup/setEnc", { service, value: newValue });
      },
    },
    backupToken: function () {
      return this.$store.state.backup.oneDriveToken;
    },
  },
  methods: {
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
    getBackupToken(business?: boolean) {
      this.LocalStorage.oneDriveBusiness = Boolean(business);
      chrome.storage.local.set({ LocalStorage: this.LocalStorage });
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      this.LocalStorage.oneDriveToken = undefined;
      this.LocalStorage.oneDriveRefreshToken = undefined;
      chrome.storage.local.set({ LocalStorage: this.LocalStorage });
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const oneDrive = new OneDrive();
      const response = await oneDrive.upload(
        this.$store.state.accounts.encryption
      );
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (
        this.LocalStorage.oneDriveRevoked === "true" ||
        this.LocalStorage.oneDriveRevoked === true
      ) {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["OneDrive"])
        );
        this.LocalStorage.oneDriveRevoked = undefined;
        chrome.storage.local.set({ LocalStorage: this.LocalStorage });
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const oneDrive = new OneDrive();
      return await oneDrive.getUser();
    },
  },
  mounted: async function () {
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  },
});
</script>
