<template>
    <div>
        <div class="text warning" v-if="!encryption.getEncryptionStatus()">{{ i18n.export_info }}</div>
        <div class="text warning" v-if="unsupportedAccounts">{{ i18n.otp_unsupported_warn }}</div>
        <a download="authenticator.txt" v-bind:href="exportOneLineOtpAuthFile" v-if="!unsupportedAccounts" class="button" target="_blank">{{ i18n.download_backup }}</a>
        <a download="authenticator.json" v-bind:href="exportFile" class="button" target="_blank" v-else>{{ i18n.download_backup }}</a>
        <a download="authenticator.json" v-bind:href="exportEncryptedFile" v-if="encryption.getEncryptionStatus()" class="button" target="_blank">{{ i18n.download_enc_backup }}</a>
        <a class="button" href="import.html" target="_blank">{{ i18n.import_backup }}</a>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';

export default Vue.extend({
    computed: mapState('accounts', ['encryption', 'unsupportedAccounts', 'exportOneLineOtpAuthFile', 'exportFile', 'exportEncryptedFile'])
})
</script>
