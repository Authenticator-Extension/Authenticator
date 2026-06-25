<template>
  <div>
    <div>
      <div
        class="text warning"
        v-show="backupToken && (!isEncrypted || !defaultEncryption)"
      >
        {{ i18n.dropbox_risk }}
      </div>
      <div v-show="backupToken">
        <div style="margin: 10px 0px 0px 20px; overflow-wrap: break-word">
          {{ i18n.account }} - {{ email }}
        </div>
      </div>
      <a-select-input
        v-show="!!defaultEncryption && backupToken"
        :label="i18n.encrypted"
        v-model="isEncrypted"
      >
        <option value="true">{{ i18n.yes }}</option>
        <option value="false">{{ i18n.no }}</option>
      </a-select-input>
      <a-button v-show="backupToken" @click="backupLogout()">
        {{ i18n.log_out }}
      </a-button>
      <div v-show="connecting && !backupToken" class="dropbox-connecting">
        <span class="dropbox-spinner"></span>{{ i18n.loading }}
      </div>
      <a-button v-show="!backupToken && !connecting" @click="getBackupToken()">
        {{ i18n.sign_in }}
      </a-button>
      <a-button v-show="backupToken" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { isChrome } from "../../browser";
import { Drive } from "../../models/backup";
import { UserSettings } from "../../models/settings";

const service = "drive";

export default defineComponent({
  data: function () {
    return {
      email: this.i18n.loading,
      connecting: false,
    };
  },
  created() {
    UserSettings.updateItems();
  },
  computed: {
    defaultEncryption: function () {
      return this.$store.state.accounts.defaultEncryption;
    },
    isEncrypted: {
      get(): boolean {
        return this.$store.state.backup.driveEncrypted;
      },
      set(newValue: string) {
        const encrypted = newValue === "true";
        UserSettings.items.driveEncrypted = encrypted;
        UserSettings.commitItems();
        this.$store.commit("backup/setEnc", { service, value: encrypted });
      },
    },
    backupToken: function () {
      return this.$store.state.backup.driveToken;
    },
  },
  methods: {
    getBackupToken() {
      this.connecting = true;
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      await new Promise((resolve: (value: boolean) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          "https://accounts.google.com/o/oauth2/revoke?token=" +
            UserSettings.items.driveToken
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (isChrome) {
              chrome.identity.removeCachedAuthToken(
                { token: UserSettings.items.driveToken as string },
                () => {
                  resolve(true);
                }
              );
            } else {
              resolve(true);
            }
            return;
          }
        };
        xhr.send();
      });
      UserSettings.removeItem("driveToken");
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.dispatch("style/hideInfo");
    },
    async backupUpload() {
      const drive = new Drive();
      const response = await drive.upload(
        this.$store.state.accounts.encryption.get(
          this.$store.state.accounts.defaultEncryption
        )
      );
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (UserSettings.items.driveRevoked === true) {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["Google Drive"])
        );
        UserSettings.removeItem("driveRevoked");
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const drive = new Drive();
      return await drive.getUser();
    },
    onAuthDone(message: { action?: string }) {
      if (message.action !== "driveauthdone") {
        return;
      }
      void this.refreshConnection();
    },
    async refreshConnection() {
      await UserSettings.updateItems();
      const connected = Boolean(UserSettings.items.driveToken);
      this.$store.commit("backup/setToken", { service, value: connected });
      if (connected) {
        this.email = await this.getUser();
      }
      this.connecting = false;
    },
  },
  mounted: async function () {
    chrome.runtime.onMessage.addListener(this.onAuthDone);
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  },
  beforeUnmount() {
    chrome.runtime.onMessage.removeListener(this.onAuthDone);
  },
});
</script>
