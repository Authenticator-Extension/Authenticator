<template>
  <div>
    <label>{{ i18n.accountName }}</label>
    <input type="text" class="input" v-model="newAccount.account">
    <label>{{ i18n.secret }}</label>
    <input type="text" class="input" v-model="newAccount.secret">
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
import { OTPType } from "../../models/otp";

export default Vue.extend({
  data: function () {
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
    addNewAccount() {
      //     _ui.instance.newAccount.secret = _ui.instance.newAccount.secret.replace(
      //       / /g,
      //       ''
      //     );
      //     if (
      //       !/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
      //       !/^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret)
      //     ) {
      //       _ui.instance.alert(
      //         _ui.instance.i18n.errorsecret + _ui.instance.newAccount.secret
      //       );
      //       return;
      //     }
      //     let type: OTPType;
      //     if (
      //       !/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
      //       /^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret) &&
      //       _ui.instance.newAccount.type === 'totp'
      //     ) {
      //       type = OTPType.hex;
      //     } else if (
      //       !/^[a-z2-7]+=*$/i.test(_ui.instance.newAccount.secret) &&
      //       /^[0-9a-f]+$/i.test(_ui.instance.newAccount.secret) &&
      //       _ui.instance.newAccount.type === 'hotp'
      //     ) {
      //       type = OTPType.hhex;
      //     } else {
      //       type = _ui.instance.newAccount.type;
      //     }
      //     const entry = new OTPEntry(
      //       type,
      //       '',
      //       _ui.instance.newAccount.secret,
      //       _ui.instance.newAccount.account,
      //       0,
      //       0
      //     );
      //     await entry.create(_ui.instance.encryption);
      //     await _ui.instance.updateEntries();
      //     _ui.instance.newAccount.type = OTPType.totp;
      //     _ui.instance.account = '';
      //     _ui.instance.secret = '';
      //     _ui.instance.newAccount.show = false;
      //     _ui.instance.closeInfo();
      //     _ui.instance.currentClass.edit = false;
      //     const codes = document.getElementById('codes');
      //     if (codes) {
      //       // wait vue apply changes to dom
      //       setTimeout(() => {
      //         codes.scrollTop = 0;
      //       }, 0);
      //     }
      //     return;
    }
  }
});
</script>
