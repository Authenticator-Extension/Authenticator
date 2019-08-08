<template>
  <div id="info">
    <div
      id="infoClose"
      v-if="info !== 'EnterPasswordPage'"
      v-on:click="hideInfo()"
    >
      <IconXCircle />
    </div>
    <component v-bind:is="info" id="infoContent"></component>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

import IconXCircle from "../../../svg/x-circle.svg";

import AboutPage from "./AboutPage.vue";
import AddAccountPage from "./AddAccountPage.vue";
import AddMethodPage from "./AddMethodPage.vue";
import SetPasswordPage from "./SetPasswordPage.vue";
import EnterPasswordPage from "./EnterPasswordPage.vue";
import ExportPage from "./ExportPage.vue";
import DropboxPage from "./DropboxPage.vue";
import DrivePage from "./DrivePage.vue";
import StorageSyncConfPage from "./StorageSyncConfPage.vue";
import PrefrencesPage from "./PrefrencesPage.vue";

export default Vue.extend({
  computed: {
    info: function() {
      return this.$store.state.currentView.info;
    }
  },
  methods: {
    hideInfo() {
      this.$store.commit("style/hideInfo");
    }
  },
  components: {
    IconXCircle,
    AboutPage,
    AddAccountPage,
    AddMethodPage,
    SetPasswordPage,
    EnterPasswordPage,
    ExportPage,
    DropboxPage,
    DrivePage,
    PrefrencesPage,
    StorageSyncConfPage
  }
});
</script>
