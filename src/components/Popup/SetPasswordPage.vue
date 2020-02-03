<template>
  <div>
    <div class="text warning">{{ i18n.security_warning }}</div>
    <label>{{ i18n.phrase }}</label>
    <input class="input" type="password" v-model="phrase" />
    <label>{{ i18n.confirm_phrase }}</label>
    <input
      class="input"
      type="password"
      v-model="confirm"
      v-on:keyup.enter="changePassphrase()"
    />
    <div v-show="!enforcePassword">
      <div id="security-save" v-on:click="changePassphrase()">
        {{ i18n.ok }}
      </div>
      <div id="security-remove" v-on:click="removePassphrase()">
        {{ i18n.remove }}
      </div>
    </div>
    <div
      class="button-small"
      v-show="enforcePassword"
      v-on:click="changePassphrase()"
    >
      {{ i18n.ok }}
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  data: function() {
    return {
      phrase: "",
      confirm: ""
    };
  },
  computed: {
    enforcePassword: function() {
      return this.$store.state.menu.enforcePassword;
    }
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

      if (this.phrase !== this.confirm) {
        this.$store.commit("notification/alert", this.i18n.phrase_not_match);
        return;
      }

      this.$store.commit("currentView/changeView", "LoadingPage");
      await this.$store.dispatch("accounts/changePassphrase", this.phrase);
      this.$store.commit("notification/alert", this.i18n.updateSuccess);
      this.$store.commit("style/hideInfo");
      return;
    }
  }
});
</script>
