<template>
  <div class="advisor">
    <div v-if="ignoreList.length > 0" class="show-all-insights">
      <a href="#" v-on:click="clearIgnoreList">{{ i18n.show_all_insights }}</a>
    </div>
    <div v-if="insights.length === 0" class="no-insight">
      {{ i18n.no_insight_available }}
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
import { defineComponent } from "vue";
import AdvisorInsight from "./AdvisorInsight.vue";
import { useAdvisorStore } from "../../store/Advisor";

export default defineComponent({
  mounted: function () {
    useAdvisorStore().updateInsight();
  },
  computed: {
    insights: function () {
      return useAdvisorStore().insights;
    },
    ignoreList: function () {
      return useAdvisorStore().ignoreList;
    },
  },
  components: {
    AdvisorInsight,
  },
  methods: {
    clearIgnoreList: function () {
      useAdvisorStore().clearIgnoreList();
    },
  },
});
</script>
