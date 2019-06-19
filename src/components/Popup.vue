<template>
<div v-cloak v-bind:class="{ 'theme-normal': !style.useHighContrast, 'theme-accessibility': style.useHighContrast }">
    <MainHeader/>
    <MainBody />

    <MenuPage />

    <div id="info" v-bind:class="{'fadein': style.fadein, 'fadeout': style.fadeout}">
        <div id="infoClose" v-if="info !== 'passphrase'" v-on:click="closeInfo()"><svg viewBox="0 0 512 512"><title id="times-circle-title">Times Circle</title><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"></path></svg></div>
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

    <!-- MESSAGE -->
    <div class="message-box" v-show="message.length && messageIdle">
        <div>{{ message.length ? message[0] : '' }}</div>
        <div class="button-small" v-on:click="closeAlert()">{{ i18n.ok }}</div>
    </div>

    <!-- CONFRIM -->
    <div class="message-box" v-show="confirmMessage !== ''">
        <div>{{ confirmMessage }}</div>
        <div class="buttons">
            <div class="button-small" v-on:click="confirmOK()">{{ i18n.yes }}</div>
            <div class="button-small" v-on:click="confirmCancel()">{{ i18n.no }}</div>
        </div>
    </div>

    <!-- NOTIFICATITON -->
    <div id="notification" v-bind:class="{'fadein': style.notificationFadein, 'fadeout': style.notificationFadeout}">{{ notification }}</div>

    <!-- QR -->
    <div id="qr" v-bind:class="{'qrfadein': style.qrfadein, 'qrfadeout': style.qrfadeout}" v-bind:style="{'background-image': qr}" v-on:click="hideQr()"></div>

    <!-- OVERLAY -->
    <div id="overlay" v-show="message.length && messageIdle || confirmMessage !== ''"></div>

    <!-- CLIPBOARD -->
    <input type="text" id="codeClipboard" />
</div>
</template>
<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';

import MainHeader from './Popup/MainHeader.vue';
import MainBody from './Popup/MainBody.vue';
import MenuPage from './Popup/MenuPage.vue';
import AboutPage from './Popup/AboutPage.vue';
import AddAccountPage from './Popup/AddAccountPage.vue';
import SetPasswordPage from './Popup/SetPasswordPage.vue';
import EnterPasswordPage from './Popup/EnterPasswordPage.vue';
import ExportPage from './Popup/ExportPage.vue';
import DropboxPage from './Popup/DropboxPage.vue';
import DrivePage from './Popup/DrivePage.vue';
import StorageSyncConfPage from './Popup/StorageSyncConfPage.vue';
import PrefrencesPage from './Popup/PrefrencesPage.vue';

const computedPrototype = [
    mapState('style', ['style']),
    mapState('qr', ['qr']),
    mapState('notification', ['message', 'messageIdle', 'confirmMessage']),
    mapState('currentView', ['info']),
    mapState('accounts', [
        "notification",
        "notificationTimeout",
    ])
]

let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
  computed,
  methods: {
  },
  components: {
      MainHeader,
      MainBody,
      MenuPage,
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
});
</script>
