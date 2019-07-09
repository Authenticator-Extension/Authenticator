<template>
  <div>
    <div class="header">
      <span id="menuName">{{ i18n.settings }}</span>
      <div class="icon" id="i-close" v-on:click="hideMenu()">
        <IconArrowLeft />
      </div>
    </div>
    <div id="menuBody">
      <div class="menuList">
        <p v-bind:title="i18n.about" v-on:click="showInfo('AboutPage')">
          <span><IconInfo /></span>{{ i18n.about }}
        </p>
      </div>
      <div class="menuList">
        <p
          v-bind:title="i18n.export_import"
          v-on:click="showInfo('ExportPage')"
        >
          <span><IconExchange /></span>{{ i18n.export_import }}
        </p>
        <p
          v-bind:title="i18n.storage_menu"
          v-on:click="showInfo('StorageSyncConfPage')"
        >
          <span><IconDatabase /></span>{{ i18n.storage_menu }}
        </p>
        <p
          v-bind:title="i18n.security"
          v-on:click="showInfo('SetPasswordPage')"
        >
          <span><IconLock /></span>{{ i18n.security }}
        </p>
        <p v-bind:title="i18n.sync_clock" v-on:click="syncClock()">
          <span><IconSync /></span>{{ i18n.sync_clock }}
        </p>
        <p
          v-bind:title="i18n.resize_popup_page"
          v-on:click="showInfo('PrefrencesPage')"
        >
          <span><IconWrench /></span>{{ i18n.resize_popup_page }}
        </p>
      </div>
      <div class="menuList">
        <p v-bind:title="i18n.feedback" v-on:click="openHelp()">
          <span><IconComments /></span>{{ i18n.feedback }}
        </p>
        <p
          v-bind:title="i18n.translate"
          v-on:click="openLink('https://crwd.in/authenticator-firefox')"
        >
          <span><IconGlobe /></span>{{ i18n.translate }}
        </p>
        <p
          v-bind:title="i18n.source"
          v-on:click="
            openLink('https://github.com/Authenticator-Extension/Authenticator')
          "
        >
          <span><IconCode /></span>{{ i18n.source }}
        </p>
      </div>
      <div id="version">Version {{ version }}</div>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { syncTimeWithGoogle } from "../../popup";

import IconArrowLeft from "../../../svg/arrow-left.svg";
import IconInfo from "../../../svg/info.svg";
import IconExchange from "../../../svg/exchange.svg";
import IconDatabase from "../../../svg/database.svg";
import IconLock from "../../../svg/lock.svg";
import IconSync from "../../../svg/sync.svg";
import IconWrench from "../../../svg/wrench.svg";
import IconComments from "../../../svg/comments.svg";
import IconGlobe from "../../../svg/globe.svg";
import IconCode from "../../../svg/code.svg";

export default Vue.extend({
  components: {
    IconArrowLeft,
    IconInfo,
    IconExchange,
    IconDatabase,
    IconLock,
    IconSync,
    IconWrench,
    IconComments,
    IconGlobe,
    IconCode
  },
  computed: {
    version: function() {
      return this.$store.state.menu.version;
    }
  },
  methods: {
    hideMenu() {
      this.$store.commit("style/hideMenu");
    },
    openHelp() {
      let url = "https://authenticator.cc/docs/en/chrome-issues";

      if (navigator.userAgent.indexOf("Firefox") !== -1) {
        url = "https://authenticator.cc/docs/en/firefox-issues";
      }

      const feedbackURL = this.$store.state.menu.feedbackURL;
      if (typeof feedbackURL === "string" && feedbackURL) {
        url = feedbackURL;
      }

      chrome.tabs.create({ url });
    },
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
    showInfo(tab: string) {
      if (tab === "SetPasswordPage" || tab === "ExportPage") {
        if (this.$store.getters["accounts/currentlyEncrypted"]) {
          this.$store.commit("notification/alert", this.i18n.phrase_incorrect);
          return;
        }
      }
      this.$store.commit("style/showInfo");
      this.$store.commit("currentView/changeView", tab);
      return;
    },
    syncClock() {
      chrome.permissions.request(
        { origins: ["https://www.google.com/"] },
        async granted => {
          if (granted) {
            const message = await syncTimeWithGoogle();
            this.$store.commit("notification/alert", this.i18n[message]);
          }
          return;
        }
      );
      return;
    }
  }
});
</script>
