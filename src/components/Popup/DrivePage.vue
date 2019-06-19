<template>
    <div>
        <div>
            <div class="text warning" v-if="driveEncrypted !== 'true' || !encryption.getEncryptionStatus()">{{ i18n.dropbox_risk }}</div>
            <div v-if="encryption.getEncryptionStatus() && driveToken">
                <label class="combo-label">{{ i18n.encrypted }}</label>
                <select v-model="driveEncrypted" v-on:change="backupUpdateEncryption('drive')">
                    <option value="true">{{ i18n.yes }}</option>
                    <option value="false">{{ i18n.no }}</option>
                </select>
            </div>
            <div class="button" v-if="driveToken" v-on:click="backupLogout('drive')">{{ i18n.log_out }}</div>
            <div class="button" v-else v-on:click="getBackupToken('drive')">{{ i18n.sign_in }}</div>
            <div class="button" v-if="driveToken" v-on:click="backupUpload('drive')">{{ i18n.manual_dropbox }}</div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

const computedPrototype = [mapState('backup', ['driveEncrypted', 'driveToken']), mapState('accounts', ['encryption'])];
let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
    computed
})
</script>
