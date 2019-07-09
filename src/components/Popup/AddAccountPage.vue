<template>
  <div>
    <label>{{ i18n.accountName }}</label>
    <input type="text" class="input" v-model="newAccount.account" />
    <label>{{ i18n.secret }}</label>
    <input type="text" class="input" v-model="newAccount.secret" />
    <select v-model="newAccount.type">
      <option v-bind:value="OTPType.totp">{{ i18n.based_on_time }}</option>
      <option v-bind:value="OTPType.hotp">{{ i18n.based_on_counter }}</option>
      <option v-bind:value="OTPType.battle">Battle.net</option>
      <option v-bind:value="OTPType.steam">Steam</option>
    </select>
    <div class="button-small" v-on:click="addNewAccount()">{{ i18n.ok }}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import { OTPType, OTPEntry } from "../../models/otp";
import * as CryptoJS from "crypto-js";

export default Vue.extend({
  data: function() {
    return {
      newAccount: {
        account: "",
        secret: "",
        type: OTPType.totp
      }
    };
  },
  computed: mapState("accounts", ["OTPType"]),
  methods: {
    async addNewAccount() {
      this.newAccount.secret = this.newAccount.secret.replace(/ /g, "");
      if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        !/^[0-9a-f]+$/i.test(this.newAccount.secret)
      ) {
        this.$store.commit("notification/alert", this.i18n.errorsecret);
        return;
      }
      let type: OTPType;
      if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        /^[0-9a-f]+$/i.test(this.newAccount.secret) &&
        this.newAccount.type === OTPType.totp
      ) {
        type = OTPType.hex;
      } else if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        /^[0-9a-f]+$/i.test(this.newAccount.secret) &&
        this.newAccount.type === OTPType.hotp
      ) {
        type = OTPType.hhex;
      } else {
        type = this.newAccount.type;
      }
      const entry = new OTPEntry({
        type,
        index: 0,
        issuer: "",
        account: this.newAccount.account,
        encrypted: false,
        hash: CryptoJS.MD5(this.newAccount.secret).toString(),
        secret: this.newAccount.secret,
        counter: 0
      });
      await entry.create(this.$store.state.accounts.encryption);
      await this.$store.dispatch("accounts/updateEntries");
      this.$store.commit("style/hideInfo");
      this.$store.commit("style/toggleEdit");
      const codes = document.getElementById("codes");
      if (codes) {
        // wait vue apply changes to dom
        setTimeout(() => {
          codes.scrollTop = 0;
        }, 0);
      }
      return;
    }
  }
});
</script>
