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
      <a-button v-show="backupToken && !needEncryption" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Dropbox } from "../../models/backup";
import { UserSettings } from "../../models/settings";

const service = "dropbox";

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
    backupToken: function (): string | undefined {
      return this.$store.state.backup.dropboxToken;
    },
    needEncryption: function (): boolean {
      return !this.defaultEncryption || !this.allEntriesEncrypted;
    },
  },
  methods: {
    getBackupToken() {
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      await new Promise((resolve: (value: boolean) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.dropboxapi.com/2/auth/token/revoke");
        xhr.setRequestHeader(
          "Authorization",
          "Bearer " + UserSettings.items.dropboxToken
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            resolve(true);
            return;
          }
        };
        xhr.send();
      });
      UserSettings.removeItem(`${service}Token`);
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const dbox = new Dropbox();
      const response = await dbox.upload(this.$store.state.accounts.encryption);
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (UserSettings.items.dropboxRevoked === true) {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["Dropbox"])
        );
        UserSettings.removeItem("dropboxToken");
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const dbox = new Dropbox();
      return await dbox.getUser();
    },
  },
  mounted: async function () {
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  },
});
</script>
