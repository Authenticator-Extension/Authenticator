<template>
  <div class="settings-page">
    <div class="page-title">{{ i18n.settings }}</div>

    <div class="settings-section-title">{{ i18n.settings_appearance }}</div>
    <div class="settings-row">
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.theme }}</div>
      </div>
      <select class="settings-select" v-model="theme">
        <option value="light">{{ i18n.theme_light }}</option>
        <option value="dark">{{ i18n.theme_dark }}</option>
        <option value="auto">{{ i18n.theme_auto }}</option>
        <option value="compact">{{ i18n.theme_compact }}</option>
        <option value="accessibility">{{ i18n.theme_high_contrast }}</option>
      </select>
    </div>
    <div class="settings-row">
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.scale }}</div>
      </div>
      <select class="settings-select" v-model="zoom">
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

    <div class="settings-section-title">{{ i18n.settings_general }}</div>
    <div class="settings-row clickable" v-on:click="onToggleAutofill()">
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.use_autofill }}</div>
      </div>
      <span class="pill" v-bind:class="{ on: useAutofill }">
        <span class="pill-knob"></span>
      </span>
    </div>
    <div
      class="settings-row"
      v-bind:class="{ clickable: !storageArea, disabled: storageArea }"
      v-on:click="onToggleSync()"
    >
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.browser_sync }}</div>
      </div>
      <span class="pill" v-bind:class="{ on: browserSync }">
        <span class="pill-knob"></span>
      </span>
    </div>
    <div class="settings-row clickable" v-on:click="onToggleSmartFilter()">
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.smart_filter }}</div>
      </div>
      <span class="pill" v-bind:class="{ on: smartFilter }">
        <span class="pill-knob"></span>
      </span>
    </div>
    <div
      class="settings-row clickable"
      v-if="isSupported"
      v-on:click="onToggleContextMenu()"
    >
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.enable_context_menu }}</div>
      </div>
      <span class="pill" v-bind:class="{ on: enableContextMenu }">
        <span class="pill-knob"></span>
      </span>
    </div>
    <div class="settings-row" v-show="!!defaultEncryption">
      <div class="settings-row-text">
        <div class="settings-row-title">{{ i18n.autolock }}</div>
        <div class="settings-row-sub">{{ i18n.minutes }}</div>
      </div>
      <input
        class="settings-num"
        type="number"
        min="0"
        v-model="autolock"
        :disabled="Boolean(enforceAutolock)"
      />
    </div>

    <button class="settings-action" v-on:click="popOut()">
      {{ i18n.popout }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { isFirefox, isSafari } from "../../browser";
import { UserSettings } from "../../models/settings";

export default defineComponent({
  computed: {
    zoom: {
      get(): number {
        return this.$store.state.menu.zoom;
      },
      set(zoom: number) {
        this.$store.commit("menu/setZoom", zoom);
      },
    },
    useAutofill: {
      get(): boolean {
        return this.$store.state.menu.useAutofill;
      },
      set(useAutofill: boolean) {
        this.$store.commit("menu/setAutofill", useAutofill);
      },
    },
    smartFilter: {
      get(): boolean {
        return this.$store.state.menu.smartFilter;
      },
      set(smartFilter: boolean) {
        this.$store.commit("menu/setSmartFilter", smartFilter);
        // only explain smart filter when turning it on, not off (#1282)
        if (smartFilter) {
          this.$store.commit(
            "notification/alert",
            this.i18n.activate_auto_filter
          );
        }
      },
    },
    enableContextMenu: {
      get(): boolean {
        return this.$store.state.menu.enableContextMenu;
      },
      set(enableContextMenu: boolean) {
        this.$store.commit("menu/setEnableContextMenu", enableContextMenu);
      },
    },
    theme: {
      get(): string {
        return this.$store.state.menu.theme;
      },
      set(theme: string) {
        this.$store.commit("menu/setTheme", theme);
      },
    },
    defaultEncryption(): string {
      return this.$store.state.accounts.defaultEncryption;
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
      },
    },
    storageArea() {
      return this.$store.state.menu.storageArea;
    },
    browserSync: {
      get(): boolean {
        return this.newStorageLocation === "sync";
      },
      set(value) {
        this.newStorageLocation = value ? "sync" : "local";
      },
    },
    isSupported: {
      get(): boolean {
        return !isFirefox && !isSafari;
      },
    },
  },
  data() {
    return {
      newStorageLocation: "",
    };
  },
  created() {
    UserSettings.updateItems().then(() => {
      this.newStorageLocation =
        this.$store.state.menu.storageArea ||
        UserSettings.items.storageLocation;
    });
  },
  methods: {
    onToggleAutofill() {
      this.useAutofill = !this.useAutofill;
    },
    onToggleSync() {
      if (this.storageArea) {
        return;
      }
      this.browserSync = !this.browserSync;
      this.migrateStorage();
    },
    onToggleSmartFilter() {
      // the setter shows the explainer alert when turning it on
      this.smartFilter = !this.smartFilter;
    },
    onToggleContextMenu() {
      this.enableContextMenu = !this.enableContextMenu;
      this.requireContextMenuPermission();
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
    },
    migrateStorage() {
      this.$store.commit("currentView/changeView", "LoadingPage");
      this.$store
        .dispatch("accounts/migrateStorage", this.newStorageLocation)
        .then(
          (m) => {
            this.$store.commit("notification/alert", this.i18n[m]);
            this.$store.commit("currentView/changeView", "PreferencesPage");
          },
          (r: string) => {
            this.$store.commit(
              "notification/alert",
              this.i18n.updateFailure + r
            );
            this.$store.commit("currentView/changeView", "PreferencesPage");
          }
        );
    },
    requireContextMenuPermission() {
      chrome.permissions.request(
        {
          permissions: ["contextMenus"],
        },
        (granted) => {
          if (!granted) {
            this.enableContextMenu = false;
            return;
          }
          chrome.runtime.sendMessage({
            action: "updateContextMenu",
          });
        }
      );
    },
  },
});
</script>
