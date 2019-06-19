<template>
    <div id="info">
        <div id="infoClose" v-if="info !== 'passphrase'" v-on:click="closeInfo()"><IconXCircle /></div>
        <div id="infoContent">
            <AboutPage v-show="info === 'about'" />
            <AddAccountPage v-show="info === 'account'" />
            <SetPasswordPage v-show="info === 'security'" />
            <EnterPasswordPage v-show="info === 'passphrase'" />
            <ExportPage v-show="info === 'export'" />
            <DropboxPage v-show="info === 'dropbox'" />
            <DrivePage v-show="info === 'drive'" />
            <StorageSyncConfPage v-show="info === 'storage'" />
            <PrefrencesPage v-show="info === 'resize'" />
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';

import IconXCircle from '../../../svg/x-circle.svg';

import AboutPage from './AboutPage.vue';
import AddAccountPage from './AddAccountPage.vue';
import SetPasswordPage from './SetPasswordPage.vue';
import EnterPasswordPage from './EnterPasswordPage.vue';
import ExportPage from './ExportPage.vue';
import DropboxPage from './DropboxPage.vue';
import DrivePage from './DrivePage.vue';
import StorageSyncConfPage from './StorageSyncConfPage.vue';
import PrefrencesPage from './PrefrencesPage.vue';

export default Vue.extend({
    computed: {
        info: function () {
            return this.$store.state.currentView.info
        }
    },
    components: {
        IconXCircle,
        AboutPage,
        AddAccountPage,
        SetPasswordPage,
        EnterPasswordPage,
        ExportPage,
        DropboxPage,
        DrivePage,
        PrefrencesPage,
        StorageSyncConfPage
    }
})
</script>
