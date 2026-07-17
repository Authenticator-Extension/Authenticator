<template>
  <div>
    <h3>{{ insight.levelText }}</h3>
    <p>{{ insight.description }}</p>
    <div class="link">
      <a v-if="insight.link" href="#" v-on:click="openLink(insight.link)">{{
        i18n.learn_more
      }}</a>
      <a href="#" v-on:click="dismiss(insight)">{{ i18n.dismiss }}</a>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { AdvisorInsight } from "../../models/advisor";
import { useAdvisorStore } from "../../store/Advisor";

export default defineComponent({
  props: {
    insight: AdvisorInsight,
  },
  methods: {
    dismiss(insight: AdvisorInsight) {
      useAdvisorStore().dismissInsight(insight.id);
    },
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
  },
});
</script>
