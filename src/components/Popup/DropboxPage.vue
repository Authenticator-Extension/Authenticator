<template>
    <div>
        <div>
            <div class="text warning" v-if="dropboxEncrypted !== 'true' || !encryption.getEncryptionStatus()">{{ i18n.dropbox_risk }}</div>
            <div v-if="encryption.getEncryptionStatus() && dropboxToken">
                <label class="combo-label">{{ i18n.encrypted }}</label>
                <select v-model="dropboxEncrypted" v-on:change="backupUpdateEncryption('dropbox')">
                    <option value="true">{{ i18n.yes }}</option>
                    <option value="false">{{ i18n.no }}</option>
                </select>
            </div>
            <div class="button" v-if="dropboxToken" v-on:click="backupLogout('dropbox')">{{ i18n.log_out }}</div>
            <div class="button" v-else v-on:click="getBackupToken('dropbox')">{{ i18n.sign_in }}</div>
            <div class="button" v-if="dropboxToken" v-on:click="backupUpload('dropbox')">{{ i18n.manual_dropbox }}</div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

const computedPrototype = [mapState('backup', ['dropboxEncrypted', 'dropboxToken']), mapState('accounts', ['encryption'])];
let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
    computed
})
</script>
