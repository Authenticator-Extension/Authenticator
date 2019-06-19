<template>
    <div>
        <div class="text warning">{{ i18n.security_warning }}</div>
        <label>{{ i18n.phrase }}</label>
        <input class="input" type="password" v-model="newPassphrase.phrase">
        <label>{{ i18n.confirm_phrase }}</label>
        <input class="input" type="password" v-model="newPassphrase.confirm" v-on:keyup.enter="changePassphrase()">
        <div id="security-save" v-on:click="changePassphrase()">{{ i18n.ok }}</div>
        <div id="security-remove" v-on:click="removePassphrase()">{{ i18n.remove }}</div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

export default Vue.extend({
    computed: mapState('accounts', ['newPassphrase'])
});
</script>
