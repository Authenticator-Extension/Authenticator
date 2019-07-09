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
    />
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
  methods: {
    applyPassphrase() {
      this.$store.dispatch("accounts/applyPassphrase", this.password);
    }
  }
});
</script>
