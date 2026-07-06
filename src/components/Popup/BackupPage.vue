<template>
  <div class="backup-page">
    <div class="page-title">{{ i18n.backup }}</div>

    <div class="backup-warning" v-if="!exportDisabled && !defaultEncryption">
      {{ i18n.export_info }}
    </div>
    <div class="backup-warning" v-if="!exportDisabled && currentlyEncrypted">
      {{ i18n.phrase_incorrect_export }}
    </div>

    <!-- On this device -->
    <div class="backup-section-title">{{ i18n.backup_on_device }}</div>
    <div class="backup-list">
      <template v-if="!exportDisabled">
        <!-- plain backup -->
        <a
          v-if="isDataLinkSupported"
          class="backup-row"
          :download="
            unsupportedAccounts ? 'authenticator.json' : 'authenticator.txt'
          "
          :href="unsupportedAccounts ? exportFile : exportOneLineOtpAuthFile"
        >
          <svg
            class="backup-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v12"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <path d="M5 21h14"></path>
          </svg>
          <div class="backup-row-text">
            <div class="backup-row-title">{{ i18n.download_backup }}</div>
          </div>
        </a>
        <div
          v-else
          class="backup-row"
          v-on:click="
            unsupportedAccounts
              ? downloadBackUpExportFile()
              : downloadBackUpOneLineOtpAuthFile()
          "
        >
          <svg
            class="backup-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v12"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <path d="M5 21h14"></path>
          </svg>
          <div class="backup-row-text">
            <div class="backup-row-title">{{ i18n.download_backup }}</div>
          </div>
        </div>

        <!-- encrypted backup -->
        <a
          v-if="!!defaultEncryption && isDataLinkSupported"
          class="backup-row"
          download="authenticator.json"
          :href="exportEncryptedFile"
        >
          <svg
            class="backup-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
            <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
          </svg>
          <div class="backup-row-text">
            <div class="backup-row-title">{{ i18n.download_enc_backup }}</div>
          </div>
        </a>
        <div
          v-else-if="!!defaultEncryption"
          class="backup-row"
          v-on:click="downloadBackUpExportEncryptedFile()"
        >
          <svg
            class="backup-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
            <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
          </svg>
          <div class="backup-row-text">
            <div class="backup-row-title">{{ i18n.download_enc_backup }}</div>
          </div>
        </div>
      </template>

      <!-- import — open in a new tab; the import page is full-width (#1) -->
      <a class="backup-row" href="import.html" target="_blank">
        <svg
          class="backup-ico"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 21V9"></path>
          <polyline points="7 14 12 9 17 14"></polyline>
          <path d="M5 3h14"></path>
        </svg>
        <div class="backup-row-text">
          <div class="backup-row-title">{{ i18n.import_backup }}</div>
        </div>
      </a>
    </div>

    <!-- Cloud sync -->
    <div v-show="!backupDisabled && isBackupServiceSupported">
      <div class="backup-section-title">{{ i18n.backup_cloud_sync }}</div>
      <div class="backup-warning" v-if="!defaultEncryption">
        {{ i18n.backup_requires_password }}
      </div>
      <div class="backup-list" v-else>
        <div class="backup-row" v-on:click="showInfo('DropboxPage')">
          <div class="cloud-chip" style="background: oklch(0.6 0.16 245)">
            <svg viewBox="0 0 24 24" fill="#fff">
              <path
                d="M6 2l6 4-6 4-6-4zM18 2l6 4-6 4-6-4zM0 14l6-4 6 4-6 4zM12 18l6-4 6 4-6 4-6-4z"
              ></path>
            </svg>
          </div>
          <div class="backup-row-text">
            <div class="backup-row-title">Dropbox</div>
            <div class="backup-row-sub" :class="{ connected: dropboxToken }">
              {{
                dropboxToken ? i18n.backup_connected : i18n.backup_not_connected
              }}
            </div>
          </div>
          <svg
            class="backup-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 6 15 12 9 18"></polyline>
          </svg>
        </div>

        <div class="backup-row disabled">
          <div class="cloud-chip" style="background: oklch(0.6 0.14 230)">
            <svg viewBox="0 0 24 24" fill="#fff">
              <path
                d="M3 13a4 4 0 0 1 3.5-4 5 5 0 0 1 9.5-1 4 4 0 0 1 1 7.9V16H6a3 3 0 0 1-3-3z"
              ></path>
            </svg>
          </div>
          <div class="backup-row-text">
            <div class="backup-row-title">OneDrive</div>
            <div class="backup-row-sub">{{ i18n.backup_unavailable }}</div>
          </div>
          <svg
            class="backup-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 6 15 12 9 18"></polyline>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { isSafari } from "../../browser";
import { stripBoundHost } from "../../utils";

export default defineComponent({
  data: function () {
    const exportData = this.$store.state.accounts.exportData;
    const exportEncData = this.$store.state.accounts.exportEncData;
    const key = this.$store.state.accounts.key;

    return {
      unsupportedAccounts: hasUnsupportedAccounts(exportData),
      exportFile: getBackupFile(exportData),
      exportEncryptedFile: getBackupFile(exportEncData, key),
      exportOneLineOtpAuthFile: getOneLineOtpBackupFile(exportData),
    };
  },
  computed: {
    defaultEncryption: function () {
      return this.$store.state.accounts.defaultEncryption;
    },
    exportDisabled: function () {
      return this.$store.state.menu.exportDisabled;
    },
    currentlyEncrypted: function () {
      return this.$store.getters["accounts/currentlyEncrypted"];
    },
    backupDisabled: function () {
      return this.$store.state.menu.backupDisabled;
    },
    isDataLinkSupported: function () {
      return !isSafari;
    },
    isBackupServiceSupported: function () {
      return !isSafari;
    },
    dropboxToken: function () {
      return this.$store.state.backup.dropboxToken;
    },
    oneDriveToken: function () {
      return this.$store.state.backup.oneDriveToken;
    },
  },
  methods: {
    showInfo(tab: string) {
      if (tab === "DropboxPage") {
        chrome.permissions.request(
          { origins: ["https://*.dropboxapi.com/*"] },
          async (granted) => {
            if (granted) {
              this.$store.commit("style/showInfo");
              this.$store.commit("currentView/changeView", tab);
            }
          }
        );
        return;
      } else if (tab === "OneDrivePage") {
        chrome.permissions.request(
          {
            origins: [
              "https://graph.microsoft.com/me/*",
              "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            ],
          },
          async (granted) => {
            if (granted) {
              this.$store.commit("style/showInfo");
              this.$store.commit("currentView/changeView", tab);
            }
            return;
          }
        );
        return;
      }
    },
    downloadBackUpOneLineOtpAuthFile() {
      const exportData = this.$store.state.accounts.exportData;
      const t = getOneLineOtpBackupFile(exportData);
      window.open(t);
    },
    downloadBackUpExportFile() {
      const exportData = this.$store.state.accounts.exportData;
      const t = getBackupFile(exportData);
      window.open(t);
    },
    downloadBackUpExportEncryptedFile() {
      const exportEncData = this.$store.state.accounts.exportEncData;
      const key = this.$store.state.accounts.key;
      const t = getBackupFile(exportEncData, key);
      window.open(t);
    },
  },
});

function hasUnsupportedAccounts(exportData: { [h: string]: RawOTPStorage }) {
  for (const entry of Object.keys(exportData)) {
    if (
      exportData[entry].type === "battle" ||
      exportData[entry].type === "steam"
    ) {
      return true;
    }
  }
  return false;
}

function getBackupFile(
  entryData: { [hash: string]: RawOTPStorage },
  key?: Object
) {
  if (key) {
    Object.assign(entryData, { key: key });
  }
  let json = JSON.stringify(entryData, null, 2);
  // for windows notepad
  json = json.replace(/\n/g, "\r\n");
  return downloadFileUrlBuilder(json);
}

function getOneLineOtpBackupFile(entryData: { [hash: string]: RawOTPStorage }) {
  const otpAuthLines: string[] = [];
  for (const hash of Object.keys(entryData)) {
    const otpStorage = entryData[hash];
    // Work on local copies — entryData is the live Vuex export state; mutating
    // it here corrupted the stored issuer/account (stripped colons, %-encoded)
    // for later JSON backups and double-encoded on a repeat .txt download.
    const safeIssuer = otpStorage.issuer
      ? removeUnsafeData(stripBoundHost(otpStorage.issuer))
      : "";
    // getExport encodes the bound host as "issuer::host"; keep it off the label
    // but put it back on the issuer parameter so the website round-trips. The
    // issuer name itself may contain "::", so only the last "::" is the
    // separator (matches migrateLegacyHost in models/otp.ts).
    const sepIndex = otpStorage.issuer
      ? otpStorage.issuer.lastIndexOf("::")
      : -1;
    const boundHost =
      sepIndex !== -1 ? otpStorage.issuer.slice(sepIndex + 2) : "";
    const issuerParam =
      safeIssuer + (boundHost ? "::" + encodeURIComponent(boundHost) : "");
    const safeAccount = otpStorage.account
      ? removeUnsafeData(otpStorage.account)
      : "";
    const label = safeIssuer ? safeIssuer + ":" + safeAccount : safeAccount;
    let type = "";
    if (otpStorage.type === "totp" || otpStorage.type === "hex") {
      type = "totp";
    } else if (otpStorage.type === "hotp" || otpStorage.type === "hhex") {
      type = "hotp";
    } else {
      continue;
    }

    const otpAuthLine =
      "otpauth://" +
      type +
      "/" +
      label +
      "?secret=" +
      otpStorage.secret +
      (issuerParam ? "&issuer=" + issuerParam : "") +
      (type === "hotp" ? "&counter=" + otpStorage.counter : "") +
      (type === "totp" && otpStorage.period
        ? "&period=" + otpStorage.period
        : "") +
      (otpStorage.digits ? "&digits=" + otpStorage.digits : "") +
      (otpStorage.algorithm ? "&algorithm=" + otpStorage.algorithm : "");

    otpAuthLines.push(otpAuthLine);
  }

  return downloadFileUrlBuilder(otpAuthLines.join("\r\n"));
}

function downloadFileUrlBuilder(content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}

function removeUnsafeData(data: string) {
  return encodeURIComponent(data.replace(/:/g, ""));
}
</script>
