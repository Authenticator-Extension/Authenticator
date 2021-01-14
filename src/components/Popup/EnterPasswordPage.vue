<template>
  <div>
    <div class="text">{{ i18n.passphrase_info }}</div>
    <a-text-input
      type="password"
      v-model="password"
      @enter="applyPassphrase()"
      :class="{ badInput: wrongPassword }"
      :autofocus="true"
    />
    <label class="warning" v-show="wrongPassword">{{
      i18n.phrase_not_match
    }}</label>
    <a-button type="small" @click="applyPassphrase()">{{ i18n.ok }}</a-button>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
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
  methods: {
    applyPassphrase() {
      this.$store.dispatch("accounts/applyPassphrase", this.password);
    },
  },
});
</script>
