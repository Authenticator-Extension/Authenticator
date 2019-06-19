<template>
<div v-cloak v-bind:class="{ 'theme-normal': !style.useHighContrast, 'theme-accessibility': style.useHighContrast }">
    <MainHeader />
    <MainBody v-bind:class="{'timeout': style.timeout && !style.isEditing, 'edit': style.isEditing }" />

    <MenuPage id="menu" v-bind:class="{'slidein': style.slidein, 'slideout': style.slideout}" />

    <PageHandler v-bind:class="{'fadein': style.fadein, 'fadeout': style.fadeout}" />

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
import PageHandler from './Popup/PageHandler.vue';

const computedPrototype = [
    mapState('style', ['style']),
    mapState('qr', ['qr']),
    mapState('notification', ['message', 'messageIdle', 'confirmMessage']),
    mapState('accounts', ["notification", "notificationTimeout"])
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
      PageHandler
  }
});
</script>
