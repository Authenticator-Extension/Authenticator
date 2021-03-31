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
      <a-button v-show="backupToken" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { OneDriveBusiness } from "../../models/backup";

const service = "onedrivebusiness";

export default Vue.extend({
  data: function () {
    return {
      email: this.i18n.loading,
    };
  },
  computed: {
    encryption: function () {
      return this.$store.state.accounts.encryption;
    },
    isEncrypted: {
      get(): boolean {
        if (localStorage.getItem(`oneDriveBusinessEncrypted`) === null) {
          this.$store.commit("backup/setEnc", { service, value: true });
          localStorage.oneDriveBusinessEncrypted = true;
          return true;
        }
        return this.$store.state.backup.driveEncrypted;
      },
      set(newValue: string) {
        localStorage.driveEncrypted = newValue;
        this.$store.commit("backup/setEnc", { service, value: newValue });
      },
    },
    backupToken: function () {
      return this.$store.state.backup.oneDriveBusinessToken;
    },
  },
  methods: {
    getBackupToken() {
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      localStorage.removeItem("oneDriveBusinessToken");
      localStorage.removeItem("oneDriveBusinessRefreshToken");
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const oneDriveBusiness = new OneDriveBusiness();
      const response = await oneDriveBusiness.upload(
        this.$store.state.encryption
      );
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (localStorage.oneDriveBusinessRevoked === "true") {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["OneDriveBusiness"])
        );
        localStorage.removeItem("oneDriveBusinessRevoked");
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const oneDriveBusiness = new OneDriveBusiness();
      return await oneDriveBusiness.getUser();
    },
  },
  mounted: async function () {
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  },
});
</script>
