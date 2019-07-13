<template>
  <div class="header">
    <span>{{ i18n.extName }}</span>
    <div v-show="!isPopup()">
      <div
        class="icon"
        id="i-menu"
        v-bind:title="i18n.settings"
        v-on:click="showMenu()"
        v-on:keyup.enter="showMenu()"
        v-show="!style.isEditing"
        v-bind:tabindex="tabindex"
      >
        <IconCog />
      </div>
      <div
        class="icon"
        id="i-lock"
        v-bind:title="i18n.lock"
        v-on:click="lock()"
        v-on:keyup.enter="lock()"
        v-show="!style.isEditing && encryption.getEncryptionStatus()"
        v-bind:tabindex="tabindex"
      >
        <IconLock />
      </div>
      <div
        class="icon"
        id="i-sync"
        v-bind:style="{
          left: encryption.getEncryptionStatus() ? '70px' : '45px'
        }"
        v-show="(dropboxToken || driveToken) && !style.isEditing"
      >
        <IconSync />
      </div>
      <div
        class="icon"
        id="i-qr"
        v-bind:title="i18n.add_qr"
        v-show="!style.isEditing"
        v-on:click="beginCapture()"
        v-on:keyup.enter="beginCapture()"
        v-bind:tabindex="tabindex"
      >
        <IconScan />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-if="!style.isEditing"
        v-on:click="editEntry()"
        v-on:keyup.enter="editEntry()"
        v-bind:tabindex="tabindex"
      >
        <IconPencil />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-else
        v-on:click="editEntry()"
        v-on:keyup.enter="editEntry()"
        v-bind:tabindex="tabindex"
      >
        <IconCheck />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { OTPEntry } from "../../models/otp";

// Icons
import IconCog from "../../../svg/cog.svg";
import IconLock from "../../../svg/lock.svg";
import IconSync from "../../../svg/sync.svg";
import IconScan from "../../../svg/scan.svg";
import IconPencil from "../../../svg/pencil.svg";
import IconCheck from "../../../svg/check.svg";

export default Vue.extend({
  computed: {
    style(): StyleState {
      return this.$store.state.style.style;
    },
    encryption(): IEncryption {
      return this.$store.state.accounts.encryption;
    },
    driveToken(): boolean {
      return this.$store.state.backup.driveToken;
    },
    dropboxToken(): boolean {
      return this.$store.state.backup.dropboxToken;
    },
    tabindex(): number {
      return this.$store.getters["style/tabindex"];
    }
  },
  methods: {
    isPopup() {
      const params = new URLSearchParams(document.location.search.substring(1));
      return params.get("popup");
    },
    showMenu() {
      this.$store.commit("style/showMenu");
    },
    editEntry() {
      this.$store.commit("style/toggleEdit");
      this.$store.commit("accounts/stopFilter");
    },
    lock() {
      document.cookie = 'passphrase=";expires=Thu, 01 Jan 1970 00:00:00 GMT"';
      chrome.runtime.sendMessage({ action: "lock" }, window.close);
      return;
    },
    async beginCapture() {
      // Insert content script
      await new Promise(
        (resolve: () => void, reject: (reason: Error) => void) => {
          try {
            return chrome.tabs.executeScript(
              { file: "/dist/content.js" },
              () => {
                chrome.tabs.insertCSS({ file: "/css/content.css" }, resolve);
              }
            );
          } catch (error) {
            return reject(error);
          }
        }
      );

      if (this.$store.getters["accounts/currentlyEncrypted"]) {
        this.$store.commit("notification/alert", this.i18n.phrase_incorrect);
        return;
      }

      chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        const tab = tabs[0];
        if (!tab || !tab.id) {
          return;
        }
        chrome.tabs.sendMessage(tab.id, { action: "capture" }, result => {
          if (result !== "beginCapture") {
            this.$store.commit("notification/alert", this.i18n.capture_failed);
          } else {
            window.close();
          }
        });
      });
      return;
    }
  },
  components: {
    IconCog,
    IconLock,
    IconSync,
    IconScan,
    IconPencil,
    IconCheck
  }
});
</script>
