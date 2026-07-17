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
import { defineComponent } from "vue";
import { OneDrive } from "../../models/backup";
import { UserSettings } from "../../models/settings";
import { useStyleStore } from "../../store/Style";
import { useBackupStore } from "../../store/Backup";
import { useNotificationStore } from "../../store/Notification";

const service = "onedrive";

export default defineComponent({
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
    isEncrypted: {
      get(): boolean {
        return useBackupStore().oneDriveEncrypted;
      },
      set(newValue: string) {
        const encrypted = newValue === "true";
        UserSettings.items.oneDriveEncrypted = encrypted;
        UserSettings.commitItems();
        useBackupStore().setEnc({ service, value: encrypted });
      },
    },
    backupToken: function () {
      return useBackupStore().oneDriveToken;
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
      useBackupStore().setToken({ service, value: false });
      useStyleStore().hideInfo();
    },
    async backupUpload() {
      const oneDrive = new OneDrive();
      const response = await oneDrive.upload(
        this.$store.state.accounts.encryption.get(
          this.$store.state.accounts.defaultEncryption,
        ),
      );
      if (response === true) {
        useNotificationStore().alert(this.i18n.updateSuccess);
      } else if (UserSettings.items.oneDriveRevoked === true) {
        useNotificationStore().alert(
          chrome.i18n.getMessage("token_revoked", ["OneDrive"]),
        );
        UserSettings.removeItem("oneDriveRevoked");
        useBackupStore().setToken({ service, value: false });
      } else {
        useNotificationStore().alert(this.i18n.updateFailure);
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
