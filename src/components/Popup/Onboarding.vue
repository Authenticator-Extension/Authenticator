<template>
  <div class="onboarding">
    <div class="onboarding-hero">
      <div class="onboarding-logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5z"></path>
          <polyline points="9 12 11 14 15 9"></polyline>
        </svg>
      </div>
      <div class="onboarding-title">{{ i18n.onboarding_title }}</div>
      <div class="onboarding-sub">{{ i18n.onboarding_subtitle }}</div>
    </div>

    <div class="onboarding-features">
      <div class="feature">
        <span class="dot" style="background: var(--ok)"></span>
        {{ i18n.onboarding_feature_offline }}
      </div>
      <div class="feature">
        <span class="dot" style="background: var(--accent)"></span>
        {{ i18n.onboarding_feature_encrypted }}
      </div>
      <div class="feature">
        <span class="dot" style="background: var(--warn)"></span>
        {{ i18n.onboarding_feature_scan }}
      </div>
    </div>

    <button class="onboarding-primary" v-on:click="getStarted()">
      {{ i18n.onboarding_get_started }}
    </button>
    <button class="onboarding-secondary" v-on:click="importBackup()">
      {{ i18n.onboarding_import }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { useMenuStore } from "../../store/Menu";

export default defineComponent({
  methods: {
    getStarted() {
      useMenuStore().setOnboardingComplete(true);
    },
    importBackup() {
      useMenuStore().setOnboardingComplete(true);
      window.open("import.html", "_blank");
    },
  },
});
</script>
