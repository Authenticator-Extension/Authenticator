<template>
  <div class="cloud-page">
    <div class="cloud-head">
      <div class="cloud-brand">
        <svg viewBox="0 0 24 24" fill="#fff">
          <path
            d="M6 2l6 4-6 4-6-4zM18 2l6 4-6 4-6-4zM0 14l6-4 6 4-6 4zM12 18l6-4 6 4-6 4-6-4z"
          ></path>
        </svg>
      </div>
      <div class="cloud-title">Dropbox</div>
    </div>

    <!-- Connected -->
    <template v-if="backupToken">
      <div class="cloud-account">
        <div class="cloud-avatar">{{ avatarLetter }}</div>
        <div class="cloud-account-text">
          <div class="cloud-email">{{ email }}</div>
          <div class="cloud-status">
            <span class="cloud-dot"></span>{{ i18n.backup_connected }}
          </div>
        </div>
      </div>

      <div class="cloud-field" v-show="!!defaultEncryption">
        <label class="field-label">{{ i18n.encrypted }}</label>
        <div class="cloud-select-wrap">
          <select
            class="cloud-select"
            v-bind:value="String(isEncrypted)"
            v-on:change="isEncrypted = $event.target.value"
          >
            <option value="true">{{ i18n.yes }}</option>
            <option value="false">{{ i18n.no }}</option>
          </select>
          <svg
            class="cloud-select-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="cloud-warning" v-show="!isEncrypted || !defaultEncryption">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
          ></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12" y2="17"></line>
        </svg>
        <div>{{ i18n.dropbox_risk }}</div>
      </div>

      <div class="cloud-actions">
        <button class="cloud-primary" v-on:click="backupUpload()">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v12"></path>
            <polyline points="7 8 12 3 17 8"></polyline>
            <path d="M5 21h14"></path>
          </svg>
          {{ i18n.manual_dropbox }}
        </button>
        <button class="cloud-logout" v-on:click="backupLogout()">
          {{ i18n.log_out }}
        </button>
      </div>
    </template>

    <!-- Not connected -->
    <template v-else>
      <div class="cloud-connect">
        <div class="cloud-brand-lg">
          <svg viewBox="0 0 24 24" fill="#fff">
            <path
              d="M6 2l6 4-6 4-6-4zM18 2l6 4-6 4-6-4zM0 14l6-4 6 4-6 4zM12 18l6-4 6 4-6 4-6-4z"
            ></path>
          </svg>
        </div>
        <div v-show="connecting" class="cloud-connecting">
          <span class="dropbox-spinner"></span>{{ i18n.loading }}
        </div>
        <button
          v-show="!connecting"
          class="cloud-primary"
          v-on:click="getBackupToken()"
        >
          {{ i18n.sign_in }}
        </button>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Dropbox } from "../../models/backup";
import { UserSettings } from "../../models/settings";

const service = "dropbox";

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
        return this.$store.state.backup.dropboxEncrypted;
      },
      set(newValue: string) {
        const encrypted = newValue === "true";
        UserSettings.items.dropboxEncrypted = encrypted;
        UserSettings.commitItems();
        this.$store.commit("backup/setEnc", { service, value: encrypted });
      },
    },
    backupToken: function () {
      return this.$store.state.backup.dropboxToken;
    },
    avatarLetter(): string {
      const e = this.email || "";
      return /^[a-z0-9]/i.test(e) ? e[0].toUpperCase() : "?";
    },
  },
  methods: {
    getBackupToken() {
      this.connecting = true;
      chrome.runtime.sendMessage({ action: service });
    },
    async backupLogout() {
      // removeItem() is read-modify-write (reload the whole settings blob,
      // delete one key, write it all back). Two un-awaited calls race: each
      // reads the same snapshot holding both tokens, deletes its own, and the
      // later write restores the other. Clear both keys in a single commit.
      await UserSettings.updateItems();
      const tokenToRevoke = UserSettings.items.dropboxToken;
      delete UserSettings.items.dropboxToken;
      delete UserSettings.items.dropboxRefreshToken;
      await UserSettings.commitItems();
      this.$store.commit("backup/setToken", { service, value: false });
      this.$store.dispatch("style/hideInfo");
      if (!tokenToRevoke) {
        return;
      }
      // best-effort remote revoke; local tokens are already gone either way
      try {
        await new Promise((resolve: (value: boolean) => void) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://api.dropboxapi.com/2/auth/token/revoke");
          xhr.setRequestHeader("Authorization", "Bearer " + tokenToRevoke);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              resolve(true);
            }
          };
          xhr.send();
        });
      } catch (e) {
        console.error("Dropbox token revoke failed", e);
      }
    },
    async backupUpload() {
      const dbox = new Dropbox();
      const response = await dbox.upload(
        this.$store.state.accounts.encryption.get(
          this.$store.state.accounts.defaultEncryption,
        ),
      );
      if (response === true) {
        this.$store.commit("notification/alert", this.i18n.updateSuccess);
      } else if (UserSettings.items.dropboxRevoked === true) {
        this.$store.commit(
          "notification/alert",
          chrome.i18n.getMessage("token_revoked", ["Dropbox"]),
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
    onAuthDone(message: { action?: string }) {
      if (message.action !== "dropboxauthdone") {
        return;
      }
      void this.refreshConnection();
    },
    async refreshConnection() {
      await UserSettings.updateItems();
      const connected = Boolean(UserSettings.items.dropboxToken);
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
