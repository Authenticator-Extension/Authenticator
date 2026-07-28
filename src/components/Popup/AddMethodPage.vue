<template>
  <div class="add-page">
    <div class="page-title">{{ i18n.add_code }}</div>

    <div class="method-card method-card--primary" @click="beginCapture()">
      <div class="method-ico">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="7" width="18" height="13" rx="3"></rect>
          <circle cx="12" cy="13.5" r="3.4"></circle>
          <path d="M8 7l1.6-2.6h4.8L16 7"></path>
        </svg>
      </div>
      <div class="method-text">{{ i18n.add_qr }}</div>
      <svg
        class="method-chevron"
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

    <div class="method-card" @click="showInfo('AddAccountPage')">
      <div class="method-ico">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="8" cy="8" r="4.5"></circle>
          <line x1="11.2" y1="11.2" x2="20" y2="20"></line>
          <line x1="20" y1="16" x2="20" y2="20"></line>
          <line x1="16" y1="20" x2="20" y2="20"></line>
        </svg>
      </div>
      <div class="method-text">{{ i18n.add_secret }}</div>
      <svg
        class="method-chevron"
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

    <div class="method-card" @click="openImport('FileImport')">
      <div class="method-ico">
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
      </div>
      <div class="method-text">{{ i18n.import_backup_file }}</div>
      <svg
        class="method-chevron"
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

    <div class="method-card" @click="openImport('QrImport')">
      <div class="method-ico">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="3"></rect>
          <circle cx="9" cy="10" r="1.8"></circle>
          <polyline points="6 18 11 13 14 16 18 12 21 15"></polyline>
        </svg>
      </div>
      <div class="method-text">{{ i18n.import_qr_images }}</div>
      <svg
        class="method-chevron"
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

    <div class="method-card" @click="openImport('TextImport')">
      <div class="method-ico">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path>
          <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path>
        </svg>
      </div>
      <div class="method-text">{{ i18n.import_otp_urls }}</div>
      <svg
        class="method-chevron"
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
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { getCurrentTab, okToInjectContentScript } from "../../utils";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";
import { useAccountsStore } from "../../store/Accounts";
export default defineComponent({
  methods: {
    showInfo(page: string) {
      if (useAccountsStore().currentlyEncrypted) {
        useNotificationStore().alert(this.i18n.phrase_incorrect);
        return;
      }
      useStyleStore().showInfo();
      useCurrentViewStore().changeView(page);
    },
    openImport(query: string) {
      window.open(`import.html?${query}`, "_blank");
    },
    async beginCapture() {
      if (useAccountsStore().currentlyEncrypted) {
        useNotificationStore().alert(this.i18n.phrase_incorrect);
        return;
      }

      // Insert content script
      const tab = await getCurrentTab();
      if (okToInjectContentScript(tab)) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["/js/content.js"],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["/css/content.css"],
        });

        chrome.runtime.sendMessage({ action: "updateContentTab", data: tab });
        chrome.tabs.sendMessage(tab.id, { action: "capture" }, (result) => {
          if (result !== "beginCapture") {
            useNotificationStore().alert(this.i18n.capture_failed);
          } else {
            window.close();
          }
        });
      }
    },
  },
});
</script>
