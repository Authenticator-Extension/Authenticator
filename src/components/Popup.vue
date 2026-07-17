<template>
  <div
    v-cloak
    v-bind:class="{
      'theme-light': theme === 'light',
      'theme-dark': theme === 'dark',
      'theme-auto': theme === 'auto',
      'theme-accessibility': theme === 'accessibility',
      'theme-compact': theme === 'compact',
      hideoutline,
    }"
    v-on:mousedown="hideoutline = true"
    v-on:keydown="hideoutline = false"
  >
    <Onboarding
      v-if="initComplete && !onboardingComplete && entries.length === 0"
    />
    <template v-else>
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
        v-on:click="hideQr()"
      >
        <div class="qr-sheet" v-if="qr" v-on:click.stop>
          <div class="qr-head">
            <div
              class="qr-mono"
              v-bind:style="{ background: qr.monoBg, color: qr.monoFg }"
            >
              {{ qr.monogram }}
            </div>
            <div class="qr-headtext">
              <div class="qr-issuer">{{ qr.issuer }}</div>
              <div class="qr-account">{{ qr.account }}</div>
            </div>
            <button class="qr-close" v-on:click="hideQr()">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18"></line>
                <line x1="18" y1="6" x2="6" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="qr-img"><img v-bind:src="qr.src" alt="" /></div>
          <div class="qr-caption-title">{{ i18n.qr_transfer_title }}</div>
          <div class="qr-caption">{{ i18n.qr_transfer_desc }}</div>
        </div>
      </div>

      <!-- CLIPBOARD -->
      <input type="text" id="codeClipboard" tabindex="-1" />
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import { mapState as mapPiniaState } from "pinia";

import MainHeader from "./Popup/MainHeader.vue";
import MainBody from "./Popup/MainBody.vue";
import MenuPage from "./Popup/MenuPage.vue";
import PageHandler from "./Popup/PageHandler.vue";
import NotificationHandler from "./Popup/NotificationHandler.vue";
import Onboarding from "./Popup/Onboarding.vue";
import { useStyleStore } from "../store/Style";
import { useQrStore } from "../store/Qr";

const computedPrototype = [
  mapPiniaState(useStyleStore, ["style"]),
  mapState("menu", ["theme", "onboardingComplete"]),
  mapPiniaState(useQrStore, ["qr"]),
  mapState("notification", ["notification"]),
  mapState("accounts", ["initComplete"]),
  mapGetters("accounts", ["entries"]),
];

let computed = {};

for (const module of computedPrototype) {
  Object.assign(computed, module);
}

export default defineComponent({
  data: function () {
    return {
      hideoutline: true,
    };
  },
  computed,
  methods: {
    hideQr() {
      useStyleStore().hideQr();
    },
  },
  components: {
    MainHeader,
    MainBody,
    MenuPage,
    PageHandler,
    NotificationHandler,
    Onboarding,
  },
});
</script>
