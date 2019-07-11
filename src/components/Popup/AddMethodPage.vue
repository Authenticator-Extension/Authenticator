<template>
  <div>
    <div class="button" v-on:click="beginCapture()">{{ i18n.add_qr }}</div>
    <div class="button" v-on:click="showInfo('AddAccountPage')">
      {{ i18n.add_secret }}
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  methods: {
    showInfo(page: string) {
      if (this.$store.getters["accounts/currentlyEncrypted"]) {
        this.$store.commit("notification/alert", this.i18n.phrase_incorrect);
        return;
      }
      this.$store.commit("style/showInfo");
      this.$store.commit("currentView/changeView", page);
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
  }
});
</script>
