<template>
  <div id="import" class="theme-auto">
    <div class="import-card" v-if="!shouldShowPassphrase">
      <div class="import-header">
        <div class="import-logo">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1>{{ i18n.import_backup }}</h1>
      </div>
      <p class="import-desc">
        {{ i18n.otp_backup_inform }}
        <a href="https://otp.ee/otpbackup" target="_blank">{{
          i18n.otp_backup_learn
        }}</a>
      </p>

      <div class="import-tabs">
        <button
          class="import-tab"
          :class="{ active: importType === 'FileImport' }"
          v-on:click="importType = 'FileImport'"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 3v5h5"></path>
            <path
              d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z"
            ></path>
          </svg>
          {{ i18n.import_backup_file }}
        </button>
        <button
          class="import-tab"
          :class="{ active: importType === 'QrImport' }"
          v-on:click="importType = 'QrImport'"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            <line x1="14" y1="14" x2="14" y2="21"></line>
            <line x1="18" y1="14" x2="21" y2="14"></line>
            <line x1="21" y1="18" x2="21" y2="21"></line>
          </svg>
          {{ i18n.import_backup_qr }}
        </button>
        <button
          class="import-tab"
          :class="{ active: importType === 'TextImport' }"
          v-on:click="importType = 'TextImport'"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="4" y1="7" x2="20" y2="7"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="17" x2="13" y2="17"></line>
          </svg>
          {{ i18n.import_backup_code }}
        </button>
      </div>

      <div class="import-panel">
        <component v-bind:is="importType" />
      </div>
    </div>
    <div v-if="shouldShowPassphrase" class="error_password">
      {{ i18n.import_error_password }}
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import FileImport from "./Import/FileImport.vue";
import QrImport from "./Import/QrImport.vue";
import TextImport from "./Import/TextImport.vue";

export default defineComponent({
  data: function () {
    const query = location.search ? location.search.substr(1) : "";
    const importType = ["FileImport", "QrImport", "TextImport"].includes(query)
      ? query
      : "FileImport";
    return {
      importType,
      shouldShowPassphrase: shouldShowPassphrase(this.$entries),
    };
  },
  components: {
    FileImport,
    QrImport,
    TextImport,
  },
  mounted() {
    chrome.runtime.onMessage.addListener((event) => {
      if (event.action === "stopImport") {
        this.shouldShowPassphrase = true;
      }
      // no response is sent, so don't return true (which would leave the
      // sender's message channel open and reject it on close)
    });
  },
});

function shouldShowPassphrase(entries: OTPEntryInterface[]) {
  for (const entry of entries) {
    if (!entry.secret) {
      return true;
    }
  }
  return false;
}
</script>
