<template>
<div>
    <div class="deleteAction" v-on:click="removeEntry(entry)"><IconMinusCircle /></div>
    <div class="sector" v-if="entry.type !== OTPType.hotp && entry.type !== OTPType.hhex" v-show="sectorStart">
    <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="4" v-bind:style="{animationDuration: entry.period + 's', animationDelay: (sectorOffset % entry.period) + 's'}"/>
        </svg>
    </div>
    <div v-bind:class="{'counter': true, 'disabled': style.hotpDiabled}" v-if="entry.type === OTPType.hotp || entry.type === OTPType.hhex" v-on:click="nextCode(entry)"><IconRedo /></div>
    <div class="issuer">{{ entry.issuer.split('::')[0] }}</div>
    <div class="issuerEdit">
        <input v-bind:placeholder="i18n.issuer" type="text" v-model="entry.issuer" v-on:change="entry.update(encryption)">
    </div>
    <div v-bind:class="{'code': true, 'hotp': entry.type === OTPType.hotp || entry.type === OTPType.hhex, 'no-copy': noCopy(entry.code), 'timeout': entry.period - second % entry.period < 5 }" v-on:click="copyCode(entry)" v-html="style.isEditing ? showBulls(entry.code) : entry.code"></div>
    <div class="issuer">{{ entry.account }}</div>
    <div class="issuerEdit">
        <input v-bind:placeholder="i18n.accountName" type="text" v-model="entry.account" v-on:change="entry.update(encryption)">
    </div>
    <div class="showqr" v-if="shouldShowQrIcon(entry)" v-on:click="showQr(entry)"><IconQr /></div>
    <div class="movehandle"><IconBars /></div>
</div>
</template>
<script lang="ts">
import Vue from 'vue'
import { OTPEntry, OTPType } from '../../models/otp'
import { mapState } from 'vuex';

import IconMinusCircle from '../../../svg/minus-circle.svg'
import IconRedo from '../../../svg/redo.svg'
import IconQr from '../../../svg/qrcode.svg'
import IconBars from '../../../svg/bars.svg'

const computedPrototype = [
    mapState("accounts", ["OTPType", "sectorStart", "sectorOffset", "second"]),
    mapState("style", ["style"])
]

let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
    computed,
    props: {
        entry: OTPEntry
    },
    methods: {
        noCopy(code: string) {
            return (code === 'Encrypted' ||
                code === 'Invalid' ||
                code.startsWith('&bull;'));
        },
        shouldShowQrIcon(entry: OTPEntry) {
            return (
                entry.secret !== 'Encrypted' &&
                entry.type !== OTPType.battle &&
                entry.type !== OTPType.steam
            );
        },
        showBulls: (code: string) => {
            if (code.startsWith('&bull;')) {
                return code;
            }
            return new Array(code.length).fill('&bull;').join('');
        },
    },
    components: {
        IconMinusCircle,
        IconRedo,
        IconQr,
        IconBars
    },
})
</script>

