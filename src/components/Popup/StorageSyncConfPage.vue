<template>
    <div>
        <!-- Storage Settings -->
        <div class="text">{{ i18n.storage_location_info }}</div>
        <label class="combo-label">{{ i18n.storage_location }}</label>
        <select v-model="newStorageLocation" :disabled="storageArea" v-on:change="migrateStorage()">
            <option value="sync">sync</option>
            <option value="local">local</option>
        </select>
        <!-- 3rd Party Backup Services -->
        <div v-show="!backupDisabled" class="text">{{ i18n.storage_sync_info }}</div>
        <p></p>
        <div class="button" v-show="!backupDisabled" v-on:click="showInfo('drive')">Google Drive</div>
        <div class="button" v-show="!backupDisabled" v-on:click="showInfo('dropbox')">Dropbox</div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

export default Vue.extend({
    computed: mapState('menu', ['newStorageLocation', 'backupDisabled', 'storageArea'])
})
</script>
