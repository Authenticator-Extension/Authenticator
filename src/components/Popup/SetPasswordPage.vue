<template>
  <div>
    <div class="text warning">{{ i18n.security_warning }}</div>
    <a-text-input :label="i18n.phrase" type="password" v-model="phrase" />
    <a-text-input
      :label="i18n.confirm_phrase"
      type="password"
      v-model="confirm"
      @enter="changePassphrase()"
    />
    <div v-show="!enforcePassword">
      <a-button id="security-save" @click="changePassphrase()">
        {{ i18n.ok }}
      </a-button>
      <a-button id="security-remove" @click="removePassphrase()">
        {{ i18n.remove }}
      </a-button>
    </div>
    <a-button type="small" v-show="enforcePassword" @click="changePassphrase()">
      {{ i18n.ok }}
    </a-button>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  data: function () {
    return {
      phrase: "",
      confirm: "",
    };
  },
  computed: {
    enforcePassword: function () {
      return this.$store.state.menu.enforcePassword;
    },
    passwordPolicy: function () {
      if (!this.$store.state.menu.passwordPolicy) {
        return null;
      }

      try {
        return new RegExp(this.$store.state.menu.passwordPolicy);
      } catch {
        console.warn(
          "Invalid password policy. The password policy is not a valid regular expression.",
          this.$store.state.menu.passwordPolicy
        );
        return null;
      }
    },
    passwordPolicyHint: function () {
      return this.$store.state.menu.passwordPolicyHint;
    },
  },
  methods: {
    async removePassphrase() {
      this.$store.commit("currentView/changeView", "LoadingPage");
      await this.$store.dispatch("accounts/changePassphrase", "");
      this.$store.commit("notification/alert", this.i18n.updateSuccess);
      this.$store.commit("style/hideInfo");
      return;
    },
    async changePassphrase() {
      if (this.phrase === "") {
        return;
      }

      if (this.passwordPolicy && !this.passwordPolicy.test(this.phrase)) {
        const hint =
          this.passwordPolicyHint || this.i18n.password_policy_default_hint;
        this.$store.commit("notification/alert", hint);
        return;
      }

      if (this.phrase !== this.confirm) {
        this.$store.commit("notification/alert", this.i18n.phrase_not_match);
        return;
      }

      this.$store.commit("currentView/changeView", "LoadingPage");
      await this.$store.dispatch("accounts/changePassphrase", this.phrase);
      this.$store.commit("notification/alert", this.i18n.updateSuccess);
      this.$store.commit("style/hideInfo");
      return;
    },
  },
});
</script>
