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
        <a href="https://authenticator.cc/docs/en/onedrive-perms">{{
          i18n.onedrive_business_perms
        }}</a>
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
    };
  },
  computed: {
    encryption: function () {
      return this.$store.state.accounts.encryption;
    },
    isEncrypted: {
      get(): boolean {
        if (localStorage.getItem(`oneDriveEncrypted`) === null) {
          this.$store.commit("backup/setEnc", { service, value: true });
          localStorage.oneDriveEncrypted = true;
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
      return this.$store.state.backup.oneDriveToken;
    },
  },
  methods: {
    getBackupToken(business?: boolean) {
      localStorage.oneDriveBusiness = Boolean(business);
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      localStorage.removeItem("oneDriveToken");
      localStorage.removeItem("oneDriveRefreshToken");
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const oneDrive = new OneDrive();
      const response = await oneDrive.upload(this.$store.state.encryption);
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (localStorage.oneDriveRevoked === "true") {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["OneDrive"])
        );
        localStorage.removeItem("oneDriveRevoked");
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
