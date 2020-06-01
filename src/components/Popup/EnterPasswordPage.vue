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
    <div
      class="button-u2f"
      v-on:click="applySecurityKey()"
      v-show="securityKeyEnabled && u2fSupportedPlatform"
    >
      <IconWindowsHello v-if="u2fSupportedPlatform === 'Win'" />
      <IconTouchId v-if="u2fSupportedPlatform === 'Mac'" />
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

import IconWindowsHello from "../../../svg/windows-hello.svg";
import IconTouchId from "../../../svg/touch-id.svg";

export default Vue.extend({
  data: function() {
    return {
      password: ""
    };
  },
  computed: {
    wrongPassword() {
      return this.$store.state.accounts.wrongPassword;
    },
    securityKeyEnabled() {
      return !!localStorage.securityTokenEncryptedKey;
    },
    u2fSupportedPlatform() {
      if (navigator.platform.indexOf("Win") > -1) {
        return "Win";
      } else if (navigator.platform.indexOf("Mac") > -1) {
        return "Mac";
      } else {
        return null;
      }
    }
  },
  methods: {
    applyPassphrase() {
      this.$store.dispatch("accounts/applyPassphrase", this.password);
    },
    applySecurityKey() {
      this.$store.dispatch("accounts/applySecurityKey");
    }
  },
  components: {
    IconWindowsHello,
    IconTouchId
  }
});
</script>
