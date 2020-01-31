<template>
  <div>
    <div class="text">{{ i18n.passphrase_info }}</div>
    <label></label>
    <input
      class="input"
      type="password"
      v-model="password"
      v-on:keyup.enter="applyPassphrase()"
      autofocus
      v-bind:class="{ badInput: wrongPassword }"
    />
    <label class="warning" v-show="wrongPassword">{{
      i18n.phrase_not_match
    }}</label>
    <div class="button-small" v-on:click="applyPassphrase()">{{ i18n.ok }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  data: function() {
    return {
      password: ""
    };
  },
  computed: {
    wrongPassword() {
      return this.$store.state.accounts.wrongPassword;
    }
  },
  methods: {
    applyPassphrase() {
      this.$store.dispatch("accounts/applyPassphrase", this.password);
    }
  }
});
</script>
