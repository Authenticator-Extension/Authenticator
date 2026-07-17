<template>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-opacity="0.3"
            stroke-width="2.5"
          ></circle>
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="42.4 14.2"
            transform="rotate(-90 12 12)"
          ></circle>
        </svg>
      </div>
      <span class="brand-name" v-on:dblclick="popOut()">{{
        style.isEditing ? i18n.edit_accounts : i18n.extName
      }}</span>
    </div>
    <div class="header-actions" v-show="!isPopup()">
      <div
        class="icon"
        id="i-menu"
        v-bind:title="i18n.settings"
        v-on:click="showMenu()"
        v-show="!style.isEditing"
      >
        <IconCog />
      </div>
      <div
        class="icon"
        id="i-plus"
        v-bind:title="i18n.add_code"
        v-on:click="showInfo('AddMethodPage')"
        v-show="style.isEditing"
      >
        <IconPlus />
      </div>
      <div
        class="icon"
        id="i-lock"
        v-bind:title="i18n.lock"
        v-on:click="lock()"
        v-show="!style.isEditing && !!defaultEncryption"
      >
        <IconLock />
      </div>
      <div
        class="icon"
        id="i-sync"
        v-bind:style="{
          left: !!defaultEncryption ? '70px' : '45px',
        }"
        v-show="
          (dropboxToken || driveToken || oneDriveToken) && !style.isEditing
        "
      >
        <IconSync />
      </div>
      <div
        class="icon"
        id="i-qr"
        v-bind:title="i18n.add_qr"
        v-show="!style.isEditing"
        v-on:click="beginCapture()"
      >
        <IconScan />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-if="!style.isEditing"
        v-on:click="editEntry()"
      >
        <IconPencil />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-else
        v-on:click="editEntry()"
      >
        <IconCheck />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { mapState as mapPiniaState } from "pinia";
import { getCurrentTab, okToInjectContentScript } from "../../utils";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";

// Icons
import IconCog from "../../../svg/cog.svg";
import IconLock from "../../../svg/lock.svg";
import IconSync from "../../../svg/sync.svg";
import IconScan from "../../../svg/scan.svg";
import IconPencil from "../../../svg/pencil.svg";
import IconCheck from "../../../svg/check.svg";
import IconPlus from "../../../svg/plus.svg";
import { isFirefox } from "../../browser";

const computedPrototype = [
  mapPiniaState(useStyleStore, ["style"]),
  mapState("accounts", ["defaultEncryption"]),
  mapState("backup", ["driveToken", "dropboxToken", "oneDriveToken"]),
];

let computed = {};

for (const module of computedPrototype) {
  Object.assign(computed, module);
}

export default defineComponent({
  computed,
  methods: {
    isPopup() {
      const params = new URLSearchParams(document.location.search.substring(1));
      return params.get("popup");
    },
    popOut() {
      let windowType;
      if (isFirefox) {
        windowType = "detached_panel";
      } else {
        windowType = "panel";
      }
      chrome.windows.create({
        url: chrome.runtime.getURL("view/popup.html?popup=true"),
        type: windowType as chrome.windows.createTypeEnum,
        height: window.innerHeight,
        width: window.innerWidth,
      });
      window.close();
    },
    showMenu() {
      useStyleStore().showMenu();
    },
    showInfo(page: string) {
      if (page === "AddMethodPage") {
        if (
          this.$store.state.menu.enforcePassword &&
          !this.$store.state.accounts.defaultEncryption
        ) {
          page = "SetPasswordPage";
        }
      }
      useStyleStore().showInfo();
      useCurrentViewStore().changeView(page);
    },
    editEntry() {
      useStyleStore().toggleEdit();
      this.$store.commit("accounts/stopFilter");
    },
    lock() {
      // The background "lock" handler is fire-and-forget (no sendResponse), so
      // the callback fires once the port closes with lastError set. Read it so
      // it isn't logged as an unchecked error, then close the popup.
      chrome.runtime.sendMessage({ action: "lock" }, () => {
        void chrome.runtime.lastError;
        window.close();
      });
      return;
    },
    async beginCapture() {
      if (
        this.$store.state.menu.enforcePassword &&
        !this.$store.state.accounts.defaultEncryption
      ) {
        useStyleStore().showInfo();
        useCurrentViewStore().changeView("SetPasswordPage");
        return;
      }

      if (this.$store.getters["accounts/currentlyEncrypted"]) {
        this.$store.commit("notification/alert", this.i18n.phrase_incorrect);
        return;
      }

      const tab = await getCurrentTab();
      // Insert content script
      if (okToInjectContentScript(tab)) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["/js/content.js"],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["/css/content.css"],
        });

        if (tab.url?.startsWith("file:")) {
          if (
            await this.$store.dispatch(
              "notification/confirm",
              this.i18n.capture_local_file_failed,
            )
          ) {
            window.open("import.html?QrImport", "_blank");
            return;
          }
        }

        chrome.runtime.sendMessage({ action: "updateContentTab", data: tab });
        chrome.tabs.sendMessage(tab.id, { action: "capture" }, (result) => {
          if (result !== "beginCapture") {
            this.$store.commit("notification/alert", this.i18n.capture_failed);
          } else {
            window.close();
          }
        });
      }
    },
  },
  components: {
    IconCog,
    IconLock,
    IconSync,
    IconScan,
    IconPencil,
    IconCheck,
    IconPlus,
  },
});
</script>
