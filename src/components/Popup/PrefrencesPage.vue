<template>
  <div>
    <div class="control-group">
      <label class="combo-label">{{ i18n.theme }}</label>
      <select v-model="theme">
        <option value="normal">{{ i18n.theme_light }}</option>
        <option value="dark">{{ i18n.theme_dark }}</option>
        <option value="accessibility">{{ i18n.theme_high_contrast }}</option>
      </select>
    </div>
    <div class="control-group">
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
    <div class="control-group">
      <label class="combo-label">{{ i18n.use_autofill }}</label>
      <input class="checkbox" type="checkbox" v-model="useAutofill" />
    </div>
    <div class="control-group">
      <label class="combo-label">{{ i18n.show_scan_overlay }}</label>
      <input class="checkbox" type="checkbox" v-model="showScanOverlay" />
    </div>
    <div class="control-group">
      <label class="combo-label">{{ i18n.smart_filter }}</label>
      <input class="checkbox" type="checkbox" v-model="smartFilter" />
    </div>
    <div class="control-group" v-show="encryption.getEncryptionStatus()">
      <label class="combo-label">{{ i18n.autolock }}</label>
      <input
        class="input"
        type="number"
        min="0"
        style="width: 70px; text-align: center;"
        v-model="autolock"
        :disabled="Boolean(enforceAutolock)"
      />
      <span class="combo-label" style="margin-left: 0; margin-right: 20px;">{{
        i18n.minutes
      }}</span>
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
    showScanOverlay: {
      get(): boolean {
        return this.$store.state.menu.showScanOverlay;
      },
      set(showScanOverlay: boolean) {
        this.$store.commit("menu/setScanOverlay", showScanOverlay);
      }
    },
    smartFilter: {
      get(): boolean {
        return this.$store.state.menu.smartFilter;
      },
      set(smartFilter: boolean) {
        this.$store.commit("menu/setSmartFilter", smartFilter);
      }
    },
    theme: {
      get(): string {
        return this.$store.state.menu.theme;
      },
      set(theme: string) {
        this.$store.commit("menu/setTheme", theme);
      }
    },
    encryption(): EncryptionInterface {
      return this.$store.state.accounts.encryption;
    },
    enforceAutolock() {
      return this.$store.state.menu.enforceAutolock;
    },
    autolock: {
      get(): number {
        if (this.$store.state.menu.enforceAutolock) {
          return this.$store.state.menu.enforceAutolock;
        } else {
          return this.$store.state.menu.autolock;
        }
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
