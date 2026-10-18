<template>
  <div
    v-cloak
    v-bind:class="{
      'theme-normal':
        effectiveTheme !== 'accessibility' &&
        effectiveTheme !== 'dark' &&
        effectiveTheme !== 'simple' &&
        effectiveTheme !== 'compact' &&
        effectiveTheme !== 'flat',
      'theme-accessibility': effectiveTheme === 'accessibility',
      'theme-dark': effectiveTheme === 'dark',
      'theme-simple': effectiveTheme === 'simple',
      'theme-compact': effectiveTheme === 'compact',
      'theme-flat': effectiveTheme === 'flat',
      hideoutline,
    }"
    v-on:mousedown="hideoutline = true"
    v-on:keydown="hideoutline = false"
  >
    <MainHeader />
    <MainBody
      v-bind:class="{
        timeout: style.timeout && !style.isEditing,
        edit: style.isEditing,
      }"
    />

    <MenuPage
      id="menu"
      v-show="style.slidein || style.slideout"
      v-bind:class="{ slidein: style.slidein, slideout: style.slideout }"
    />

    <PageHandler
      v-bind:class="{
        fadein: style.fadein,
        fadeout: style.fadeout,
        show: style.show,
      }"
    />

    <NotificationHandler />

    <!-- EPHERMAL MESSAGE -->
    <div
      id="notification"
      v-bind:class="{
        fadein: style.notificationFadein,
        fadeout: style.notificationFadeout,
      }"
    >
      {{ notification }}
    </div>

    <!-- QR -->
    <div
      id="qr"
      v-bind:class="{ qrfadein: style.qrfadein, qrfadeout: style.qrfadeout }"
      v-bind:style="{ 'background-image': qr }"
      v-on:click="hideQr()"
    ></div>

    <!-- CLIPBOARD -->
    <input type="text" id="codeClipboard" tabindex="-1" />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

import MainHeader from "./Popup/MainHeader.vue";
import MainBody from "./Popup/MainBody.vue";
import MenuPage from "./Popup/MenuPage.vue";
import PageHandler from "./Popup/PageHandler.vue";
import NotificationHandler from "./Popup/NotificationHandler.vue";

const computedPrototype = [
  mapState("style", ["style"]),
  mapState("menu", ["theme"]),
  mapState("qr", ["qr"]),
  mapState("notification", ["notification"]),
];

let computed = {};

for (const module of computedPrototype) {
  Object.assign(computed, module);
}

Object.assign(computed, {
  effectiveTheme(this: { theme: string; systemDark: boolean }) {
    if (this.theme === "system") {
      return this.systemDark ? "dark" : "normal";
    }
    return this.theme;
  },
});

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export default Vue.extend({
  data: function () {
    return {
      hideoutline: true,
      systemDark: darkQuery.matches,
    };
  },
  computed,
  created() {
    darkQuery.addEventListener("change", this.onSystemThemeChange);
  },
  beforeDestroy() {
    darkQuery.removeEventListener("change", this.onSystemThemeChange);
  },
  methods: {
    onSystemThemeChange(event: MediaQueryListEvent) {
      this.systemDark = event.matches;
    },
    hideQr() {
      this.$store.commit("style/hideQr");
    },
  },
  components: {
    MainHeader,
    MainBody,
    MenuPage,
    PageHandler,
    NotificationHandler,
  },
});
</script>
