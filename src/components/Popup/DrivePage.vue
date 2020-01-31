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
import { Drive } from "../../models/backup";

const service = "drive";

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
        return this.$store.state.backup.driveEncrypted;
      },
      set(newValue: string) {
        localStorage.driveEncrypted = newValue;
        this.$store.commit("backup/setEnc", { service, value: newValue });
      }
    },
    backupToken: function() {
      return this.$store.state.backup.driveToken;
    }
  },
  methods: {
    getBackupToken() {
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      await new Promise((resolve: (value: boolean) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          "https://accounts.google.com/o/oauth2/revoke?token=" +
            localStorage.driveToken
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (navigator.userAgent.indexOf("Chrome") !== -1) {
              chrome.identity.removeCachedAuthToken(
                { token: localStorage.driveToken },
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
      localStorage.removeItem("driveToken");
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.commit("style/hideInfo");
    },
    async backupUpload() {
      const drive = new Drive();
      const response = await drive.upload(this.$store.state.encryption);
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (localStorage.driveRevoked === "true") {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["Google Drive"])
        );
        localStorage.removeItem("driveRevoked");
        this.$store.commit("backup/setToken", { service, value: false });
      } else {
        this.$store.commit("notification/alert", this.i18n.updateFailure);
      }
    },
    async getUser() {
      const drive = new Drive();
      return await drive.getUser();
    }
  },
  mounted: async function() {
    if (this.backupToken) {
      this.email = await this.getUser();
    }
  }
});
</script>
