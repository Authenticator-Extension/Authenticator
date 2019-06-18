<template>
    <div class="header">
        <span>{{ i18n.extName }}</span>
        <div v-show="!isPopup()">
            <div class="icon" id="i-menu" v-bind:title="i18n.settings" v-on:click="showMenu()" v-show="!style.isEditing"><IconCog /></div>
            <div class="icon" id="i-lock" v-bind:title="i18n.lock" v-on:click="lock()" v-show="!style.isEditing && encryption.getEncryptionStatus()"><IconLock /></div>
            <div class="icon" id="i-sync" v-bind:style="{left: encryption.getEncryptionStatus() ? '70px' : '45px'}" v-show="(dropboxToken !== '' || driveToken !== '') && !style.isEditing"><IconSync /></div>
            <div class="icon" id="i-qr" v-bind:title="i18n.add_qr" v-show="!style.isEditing" v-on:click="beginCapture()"><IconScan /></div>
            <div class="icon" id="i-edit" v-bind:title="i18n.edit" v-if="!style.isEditing" v-on:click="editEntry()"><IconPencil /></div>
            <div class="icon" id="i-edit" v-bind:title="i18n.edit" v-else v-on:click="editEntry()"><IconCheck /></div>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

// Icons
import IconCog from '../../../svg/cog.svg';
import IconLock from '../../../svg/lock.svg';
import IconSync from '../../../svg/sync.svg';
import IconScan from '../../../svg/scan.svg';
import IconPencil from '../../../svg/pencil.svg';
import IconCheck from '../../../svg/check.svg';

const computedPrototype = [
    mapState("style", ["style"]),
    mapState("accounts", ["encryption"]),
    mapState("backup", ["driveToken", "dropboxToken"]),
];

let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
  computed,
  methods: {
    isPopup() {
      const params = new URLSearchParams(document.location.search.substring(1));
      return params.get("popup");
    }
  },
  components: {
    IconCog,
    IconLock,
    IconSync,
    IconScan,
    IconPencil,
    IconCheck
  }
});
</script>
