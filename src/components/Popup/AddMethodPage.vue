<template>
  <div>
    <div class="button" v-on:click="beginCapture()">{{ i18n.add_qr }}</div>
    <div class="button" v-on:click="showInfo('AddAccountPage')">{{ i18n.add_secret }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  methods: {
    showInfo(page: string) {
      this.$store.commit("style/showInfo");
      this.$store.commit("currentView/changeView", page);
    }
  }
});
</script>
