<template>
    <div id="menu" v-bind:class="{'slidein': style.slidein, 'slideout': style.slideout}">
        <div class="header">
            <span id="menuName">{{ i18n.settings }}</span>
            <div class="icon" id="i-close" v-on:click="closeMenu()"><IconArrowLeft /></div>
        </div>
        <div id="menuBody">
            <div class="menuList">
                <p v-bind:title="i18n.about" v-on:click="showInfo('about')"><span><IconInfo /></span>{{ i18n.about }}</p>
            </div>
            <div class="menuList">
                <p v-bind:title="i18n.export_import" v-on:click="showInfo('export')"><span><IconExchange /></span>{{ i18n.export_import }}</p>
                <p v-bind:title="i18n.storage_menu" v-on:click="showInfo('storage')"><span><IconDatabase /></span>{{ i18n.storage_menu }}</p>
                <p v-bind:title="i18n.security" v-on:click="showInfo('security')"><span><IconLock /></span>{{ i18n.security }}</p>
                <p v-bind:title="i18n.sync_clock" v-on:click="syncClock()"><span><IconSync /></span>{{ i18n.sync_clock }}</p>
                <p v-bind:title="i18n.resize_popup_page" v-on:click="showInfo('resize')"><span><IconWrench /></span>{{ i18n.resize_popup_page }}</p>
            </div>
                <div class="menuList">
                <p v-bind:title="i18n.feedback" v-on:click="openHelp()"><span><IconComments /></span>{{ i18n.feedback }}</p>
                <p v-bind:title="i18n.translate" v-on:click="openLink('https://crwd.in/authenticator-firefox')"><span><IconGlobe /></span>{{ i18n.translate }}</p>
                <p v-bind:title="i18n.source" v-on:click="openLink('https://github.com/Authenticator-Extension/Authenticator')"><span><IconCode /></span>{{ i18n.source }}</p>
            </div>
            <div id="version">Version {{ version }}</div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'

import IconArrowLeft from '../../../svg/arrow-left.svg'
import IconInfo from '../../../svg/info.svg'
import IconExchange from '../../../svg/exchange.svg'
import IconDatabase from '../../../svg/database.svg'
import IconLock from '../../../svg/lock.svg'
import IconSync from '../../../svg/sync.svg'
import IconWrench from '../../../svg/wrench.svg'
import IconComments from '../../../svg/comments.svg'
import IconGlobe from '../../../svg/globe.svg'
import IconCode from '../../../svg/code.svg'

export default Vue.extend({
    components: {
        IconArrowLeft,
        IconInfo,
        IconExchange,
        IconDatabase,
        IconLock,
        IconSync,
        IconWrench,
        IconComments,
        IconGlobe,
        IconCode
    },
    computed: {
        style: function () {
            return this.$store.state.style.style
        },
        version: function () {
            return this.$store.state.menu.version
        }
    }
})
</script>
