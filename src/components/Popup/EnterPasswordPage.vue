<template>
  <div class="lock-page" v-on:keydown.stop>
    <div class="lock-hero">
      <div class="lock-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
          <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
          <circle cx="12" cy="16" r="1.4"></circle>
        </svg>
      </div>
      <div class="lock-title">{{ i18n.vault_locked }}</div>
      <div class="lock-desc">{{ i18n.passphrase_info }}</div>
      <input
        ref="pw"
        class="lock-input"
        v-bind:class="{ badInput: wrongPassword }"
        type="password"
        v-model="password"
        v-on:keyup.enter="applyPassphrase()"
      />
      <label class="warning lock-error" v-show="wrongPassword">{{
        i18n.phrase_not_match
      }}</label>
    </div>
    <button class="lock-unlock" v-on:click="applyPassphrase()">
      {{ i18n.unlock }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { useCurrentViewStore } from "../../store/CurrentView";

export default defineComponent({
  data: function () {
    return {
      password: "",
    };
  },
  computed: {
    wrongPassword() {
      return this.$store.state.accounts.wrongPassword;
    },
  },
  mounted() {
    (this.$refs.pw as HTMLInputElement | undefined)?.focus();
  },
  methods: {
    async applyPassphrase() {
      try {
        await this.$store.dispatch("accounts/applyPassphrase", this.password);
      } catch (error) {
        // applyPassphrase switches to LoadingPage first; if decryption/migration
        // throws, recover the UI instead of leaving the user stuck there.
        useCurrentViewStore().changeView("EnterPasswordPage");
        this.$store.commit(
          "notification/alert",
          error instanceof Error ? error.message : String(error),
        );
        return;
      }
      const firstEntry = document.querySelector(
        ".entry[tabindex='0']",
      ) as HTMLElement;
      firstEntry?.focus();
    },
  },
});
</script>
