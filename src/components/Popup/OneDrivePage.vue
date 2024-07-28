<template>
  <div>
    <div>
      <div class="text warning" v-show="needEncryption">
        {{ i18n.encryption_required }}
      </div>
      <div v-show="backupToken">
        <div style="margin: 10px 0px 0px 20px; overflow-wrap: break-word">
          {{ i18n.account }} - {{ email }}
        </div>
      </div>
      <a-button v-show="backupToken" @click="backupLogout()">
        {{ i18n.log_out }}
      </a-button>
      <a-button
        v-show="!backupToken && !needEncryption"
        @click="getBackupToken()"
      >
        {{ i18n.sign_in }}
      </a-button>
      <a-button
        v-show="!backupToken && !needEncryption"
        @click="getBackupToken(true)"
      >
        {{ i18n.sign_in_business }}
      </a-button>
      <div class="text" v-show="!backupToken && !needEncryption">
        <a
          v-on:click="openLink('https://otp.ee/onedriveperms')"
          href="https://otp.ee/onedriveperms"
          >{{ i18n.onedrive_business_perms }}</a
        >
      </div>
      <a-button v-show="backupToken && !needEncryption" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { OneDrive } from "../../models/backup";
import { UserSettings } from "../../models/settings";

const service = "onedrive";

export default Vue.extend({
  data: function () {
    return {
      email: this.i18n.loading,
    };
  },
  created() {
    UserSettings.updateItems();
  },
  computed: {
    defaultEncryption: function () {
      return this.$store.state.accounts.defaultEncryption;
    },
    allEntriesEncrypted: function (): boolean {
      return this.$store.getters["accounts/allEntriesEncrypted"];
    },
    needEncryption: function (): boolean {
      return !this.defaultEncryption || !this.allEntriesEncrypted;
    },
    backupToken: function (): string | undefined {
      return this.$store.state.backup.oneDriveToken;
    },
  },
  methods: {
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
    getBackupToken(business?: boolean) {
      UserSettings.items.oneDriveBusiness = Boolean(business);
      UserSettings.commitItems();
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      UserSettings.items.oneDriveToken = undefined;
      UserSettings.items.oneDriveRefreshToken = undefined;
      UserSettings.commitItems();
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
      } else if (UserSettings.items.oneDriveRevoked === true) {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["OneDrive"])
        );
        UserSettings.removeItem("oneDriveRevoked");
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
