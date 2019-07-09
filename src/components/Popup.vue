<template>
  <div
    v-cloak
    v-bind:class="{
      'theme-normal': !useHighContrast,
      'theme-accessibility': useHighContrast
    }"
  >
    <MainHeader />
    <MainBody
      v-bind:class="{
        timeout: style.timeout && !style.isEditing,
        edit: style.isEditing
      }"
    />

    <MenuPage
      id="menu"
      v-bind:class="{ slidein: style.slidein, slideout: style.slideout }"
    />

    <PageHandler
      v-bind:class="{ fadein: style.fadein, fadeout: style.fadeout }"
    />

    <NotificationHandler />

    <!-- EPHERMAL MESSAGE -->
    <div
      id="notification"
      v-bind:class="{
        fadein: style.notificationFadein,
        fadeout: style.notificationFadeout
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
    <input type="text" id="codeClipboard" />
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
  mapState("menu", ["useHighContrast"]),
  mapState("qr", ["qr"]),
  mapState("notification", ["notification"])
];

let computed = {};

for (const module of computedPrototype) {
  Object.assign(computed, module);
}

export default Vue.extend({
  computed,
  methods: {
    hideQr() {
      this.$store.commit("style/hideQr");
    }
  },
  components: {
    MainHeader,
    MainBody,
    MenuPage,
    PageHandler,
    NotificationHandler
  }
});
</script>
