<template>
  <div class="cloud-page drive">
    <!-- Connected (17d) -->
    <template v-if="backupToken">
      <div class="cloud-head">
        <div class="cloud-brand">
          <svg viewBox="0 0 87 78">
            <path
              fill="#0066da"
              d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
            ></path>
            <path
              fill="#00ac47"
              d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
            ></path>
            <path
              fill="#ea4335"
              d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.8 57.1c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
            ></path>
            <path
              fill="#00832d"
              d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
            ></path>
            <path
              fill="#2684fc"
              d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            ></path>
            <path
              fill="#ffba00"
              d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            ></path>
          </svg>
        </div>
        <div class="cloud-title">Google Drive</div>
      </div>

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

    <!-- Connect (17c) -->
    <template v-else>
      <div class="cloud-hero">
        <div class="cloud-hero-logo">
          <svg viewBox="0 0 87 78">
            <path
              fill="#0066da"
              d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
            ></path>
            <path
              fill="#00ac47"
              d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
            ></path>
            <path
              fill="#ea4335"
              d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.8 57.1c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
            ></path>
            <path
              fill="#00832d"
              d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
            ></path>
            <path
              fill="#2684fc"
              d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
            ></path>
            <path
              fill="#ffba00"
              d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
            ></path>
          </svg>
        </div>
        <div class="cloud-hero-title">{{ i18n.drive_sync_title }}</div>
        <div class="cloud-hero-desc">{{ i18n.drive_sync_desc }}</div>
      </div>

      <div class="cloud-foot">
        <div class="cloud-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5z"></path>
          </svg>
          {{ i18n.cloud_e2e_note }}
        </div>
        <div v-show="connecting" class="cloud-connecting">
          <span class="dropbox-spinner"></span>{{ i18n.loading }}
        </div>
        <button
          v-show="!connecting"
          class="cloud-primary"
          v-on:click="getBackupToken()"
        >
          {{ i18n.drive_sign_in }}
        </button>
      </div>
    </template>
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
