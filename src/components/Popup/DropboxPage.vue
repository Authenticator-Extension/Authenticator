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
        <div style="margin: 10px 0px 0px 20px; overflow-wrap: break-word;">
          {{ i18n.account }} - {{ email }}
        </div>
      </div>
      <div v-show="encryption.getEncryptionStatus() && backupToken">
        <label class="combo-label">{{ i18n.encrypted }}</label>
        <select v-model="isEncrypted">
          <option value="true">{{ i18n.yes }}</option>
          <option value="false">{{ i18n.no }}</option>
        </select>
      </div>
      <div class="button" v-show="backupToken" v-on:click="backupLogout()">
        {{ i18n.log_out }}
      </div>
      <div class="button" v-show="!backupToken" v-on:click="getBackupToken()">
        {{ i18n.sign_in }}
      </div>
      <div class="button" v-show="backupToken" v-on:click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Dropbox } from "../../models/backup";

const service = "dropbox";

export default Vue.extend({
  data: function() {
    return {
      email: this.i18n.loading
    };
  },
  computed: {
    encryption: function() {
      return this.$store.state.accounts.encryption;
    },
    isEncrypted: {
      get(): boolean {
        if (localStorage.getItem(`${service}Encrypted`) === null) {
          this.$store.commit("backup/setEnc", { service, value: true });
          localStorage[`${service}Encrypted`] = true;
          return true;
        }
        return this.$store.state.backup.dropboxEncrypted;
      },
      set(newValue: string) {
        localStorage.dropboxEncrypted = newValue;
        this.$store.commit("backup/setEnc", { service, value: newValue });
      }
    },
    backupToken: function() {
      return this.$store.state.backup.dropboxToken;
    }
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
          "Bearer " + localStorage.dropboxToken
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            resolve(true);
            return;
          }
        };
        xhr.send();
      });
      localStorage.removeItem(`${service}Token`);
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const dbox = new Dropbox();
      const response = await dbox.upload(this.$store.state.encryption);
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (localStorage.dropboxRevoked === "true") {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["Dropbox"])
        );
        localStorage.removeItem("dropboxRevoked");
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const dbox = new Dropbox();
      return await dbox.getUser();
    }
  },
  mounted: async function() {
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  }
});
</script>
