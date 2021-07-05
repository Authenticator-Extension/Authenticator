<template>
  <div class="advisor">
    <div v-if="ignoreList.length > 0" class="show-all-insights">
      <a href="#" v-on:click="clearIgnoreList">{{
        this.i18n.show_all_insights
      }}</a>
    </div>
    <div v-if="insights.length === 0" class="no-insight">
      {{ this.i18n.no_insight_available }}
    </div>
    <AdvisorInsight
      class="insight"
      v-for="insight in insights"
      :key="insight.id"
      v-bind:insight="insight"
      v-bind:level="insight.level"
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import AdvisorInsight from "./AdvisorInsight.vue";

export default Vue.extend({
  mounted: function () {
    this.$store.commit("advisor/updateInsight");
  },
  computed: {
    insights: function () {
      return this.$store.state.advisor.insights;
    },
    ignoreList: function () {
      return this.$store.state.advisor.ignoreList;
    },
  },
  components: {
    AdvisorInsight,
  },
  methods: {
    clearIgnoreList: function () {
      this.$store.commit("advisor/clearIgnoreList");
    },
  },
});
</script>
