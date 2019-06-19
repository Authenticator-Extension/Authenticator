<template>
    <div>
        <div v-show="!newAccount.show">
            <div class="button" v-on:click="beginCapture()">{{ i18n.add_qr }}</div>
            <div class="button" v-on:click="addAccountManually()">{{ i18n.add_secret }}</div>
        </div>
        <div v-show="newAccount.show">
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
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

export default Vue.extend({
    computed: mapState('accounts', ['OTPType', 'newAccount'])
})
</script>
