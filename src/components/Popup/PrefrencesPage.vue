<template>
  <div>
    <div>
      <label class="combo-label">{{ i18n.scale }}</label>
      <select v-model="zoom">
        <option value="125">125%</option>
        <option value="100">100%</option>
        <option value="90">90%</option>
        <option value="80">80%</option>
        <option value="67">67%</option>
        <option value="57">57%</option>
        <option value="50">50%</option>
        <option value="40">40%</option>
        <option value="33">33%</option>
        <option value="25">25%</option>
        <option value="20">20%</option>
      </select>
    </div>
    <div>
      <label class="combo-label">{{ i18n.use_autofill }}</label>
      <input class="checkbox" type="checkbox" v-model="useAutofill" />
    </div>
    <div>
      <label class="combo-label">{{ i18n.use_high_contrast }}</label>
      <input class="checkbox" type="checkbox" v-model="useHighContrast" />
    </div>
    <div style="display: flex;" v-show="encryption.getEncryptionStatus()">
      <label style="margin-left: 20px;">{{ i18n.autolock }}</label>
      <input
        class="input"
        type="number"
        min="0"
        style="width: 70px;"
        v-model="autolock"
      />
      <span style="margin-top: 10px;">{{ i18n.minutes }}</span>
    </div>
    <div class="button" v-on:click="popOut()">{{ i18n.popout }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  computed: {
    zoom: {
      get(): number {
        return this.$store.state.menu.zoom;
      },
      set(zoom: number) {
        this.$store.commit("menu/setZoom", zoom);
      }
    },
    useAutofill: {
      get(): boolean {
        return this.$store.state.menu.useAutofill;
      },
      set(useAutofill: boolean) {
        this.$store.commit("menu/setAutofill", useAutofill);
      }
    },
    useHighContrast: {
      get(): boolean {
        return this.$store.state.menu.useHighContrast;
      },
      set(useHighContrast: boolean) {
        this.$store.commit("menu/setHighContrast", useHighContrast);
      }
    },
    encryption(): IEncryption {
      return this.$store.state.accounts.encryption;
    },
    autolock: {
      get(): number {
        return this.$store.state.menu.autolock;
      },
      set(autolock: number) {
        this.$store.commit("menu/setAutolock", autolock);
        chrome.runtime.sendMessage({ action: "resetAutolock" });
      }
    }
  },
  methods: {
    popOut() {
      let windowType;
      if (navigator.userAgent.indexOf("Firefox") !== -1) {
        windowType = "detached_panel";
      } else {
        windowType = "panel";
      }
      chrome.windows.create({
        url: chrome.extension.getURL("view/popup.html?popup=true"),
        type: windowType,
        height: window.innerHeight,
        width: window.innerWidth
      });
    }
  }
});
</script>
