<template>
  <div id="info">
    <div
      id="infoClose"
      v-if="!(info === 'EnterPasswordPage' || info === 'LoadingPage')"
      v-on:click="hideInfo()"
    >
      <IconXCircle />
    </div>
    <component v-bind:is="info" id="infoContent"></component>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

import IconXCircle from "../../../svg/x-circle.svg";

import AddAccountPage from "./AddAccountPage.vue";
import AddMethodPage from "./AddMethodPage.vue";
import SetPasswordPage from "./SetPasswordPage.vue";
import EnterPasswordPage from "./EnterPasswordPage.vue";
import BackupPage from "./BackupPage.vue";
import DropboxPage from "./DropboxPage.vue";
import DrivePage from "./DrivePage.vue";
import OneDrivePage from "./OneDrivePage.vue";
import PreferencesPage from "./PreferencesPage.vue";
import AdvisorPage from "./AdvisorPage.vue";
import LoadingPage from "./LoadingPage.vue";

export default defineComponent({
  computed: {
    info: function () {
      return this.$store.state.currentView.info;
    },
  },
  methods: {
    hideInfo() {
      this.$store.dispatch("style/hideInfo");
    },
  },
  components: {
    IconXCircle,
    AddAccountPage,
    AddMethodPage,
    SetPasswordPage,
    EnterPasswordPage,
    BackupPage,
    DropboxPage,
    DrivePage,
    OneDrivePage,
    PreferencesPage,
    AdvisorPage,
    LoadingPage,
  },
});
</script>
