<template>
<div v-cloak v-bind:class="{ 'theme-normal': !style.useHighContrast, 'theme-accessibility': style.useHighContrast }">
    <MainHeader/>
    <MainBody />

    <MenuPage />

    <div id="info" v-bind:class="{'fadein': style.fadein, 'fadeout': style.fadeout}">
        <div id="infoClose" v-if="info !== 'passphrase'" v-on:click="closeInfo()"><svg viewBox="0 0 512 512"><title id="times-circle-title">Times Circle</title><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"></path></svg></div>
        <div id="infoContent">
            <AboutPage v-show="info === 'about'" />
            <!-- ADD ACCOUNT -->
            <AddAccountPage v-show="info === 'account'" />
            <!-- SECURITY -->
            <div v-show="info === 'security'">
                <div class="text warning">{{ i18n.security_warning }}</div>
                <label>{{ i18n.phrase }}</label>
                <input class="input" type="password" v-model="newPassphrase.phrase">
                <label>{{ i18n.confirm_phrase }}</label>
                <input class="input" type="password" v-model="newPassphrase.confirm" v-on:keyup.enter="changePassphrase()">
                <div id="security-save" v-on:click="changePassphrase()">{{ i18n.ok }}</div>
                <div id="security-remove" v-on:click="removePassphrase()">{{ i18n.remove }}</div>
            </div>
            <!-- PASSPHRASE -->
            <div v-show="info === 'passphrase'">
                <div class="text">{{ i18n.passphrase_info }}</div>
                <label></label>
                <input class="input" type="password" v-model="passphrase" v-on:keyup.enter="applyPassphrase()" autofocus>
                <div class="button-small" v-on:click="applyPassphrase()">{{ i18n.ok }}</div>
            </div>
            <!-- EXPORT -->
            <div v-show="info === 'export'">
                <div class="text warning" v-if="!encryption.getEncryptionStatus()">{{ i18n.export_info }}</div>
                <div class="text warning" v-if="unsupportedAccounts">{{ i18n.otp_unsupported_warn }}</div>
                <a download="authenticator.txt" v-bind:href="exportOneLineOtpAuthFile" v-if="!unsupportedAccounts" class="button" target="_blank">{{ i18n.download_backup }}</a>
                <a download="authenticator.json" v-bind:href="exportFile" class="button" target="_blank" v-else>{{ i18n.download_backup }}</a>
                <a download="authenticator.json" v-bind:href="exportEncryptedFile" v-if="encryption.getEncryptionStatus()" class="button" target="_blank">{{ i18n.download_enc_backup }}</a>
                <a class="button" href="import.html" target="_blank">{{ i18n.import_backup }}</a>
            </div>
            <!-- DROPBOX -->
            <div v-show="info === 'dropbox'">
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
            <!-- DRIVE -->
            <div v-show="info === 'drive'">
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
            <!-- STORAGE & SYNC SETTINGS -->
            <div v-show="info === 'storage'">
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
            <!-- POPUP PAGE SETTINGS -->
            <div v-show="info === 'resize'">
                <div>
                    <label class="combo-label">{{ i18n.scale }}</label>
                    <select v-model="zoom" v-on:change="saveZoom()">
                        <option value="125">125%</option>
                        <option value="100">100%</option>
                        <option value="90">90%</option>
                        <option value="80">80%</option>
                        <option value="67">67%</option>
                        <option value="57">57%</option>
                        <option value="50">50%</option>
                        <option value="40">40%</option>
                        <option value="33">33%</option>
                        <option value="25">25%</option>
                        <option value="20">20%</option>
                    </select>
                </div>
                <div>
                    <label class="combo-label">{{ i18n.use_autofill }}</label>
                    <input class="checkbox" type="checkbox" v-model="useAutofill" v-on:change="saveAutofill()">
                </div>
                <div>
                    <label class="combo-label">{{ i18n.use_high_contrast }}</label>
                    <input class="checkbox" type="checkbox" v-model="useHighContrast" v-on:change="saveHighContrast()">
                </div>
                <div class="button" v-on:click="popOut()">{{ i18n.popout }}</div>
            </div>
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

const computedPrototype = [
    mapState('style', ['style']),
    mapState('qr', ['qr']),
    mapState('password', ['passphrase']),
    mapState('notification', ['message', 
    'messageIdle',
     'confirmMessage']),
    mapState('menu', ['version', 'zoom', 'useAutofill', 'useHighContrast',
    'newStorageLocation', 'backupDisabled', 'storageArea']),
    mapState('currentView', ['info']),
    mapState('backup', ['dropboxEncrypted', 'driveEncrypted', 'dropboxToken',
    'driveToken']),
    mapState('accounts', [
        "entries",
        "encryption",
        "OTPType",
        "shouldShowPassphrase",
        "exportData",
        "exportEncData",
        "exportFile",
        "exportEncryptedFile",
        "exportOneLineOtpAuthFile",
        "getFilePassphrase",
        "sector",
        "sectorStart",
        "sectorOffset",
        "second",
        "notification",
        "notificationTimeout",
        "filter",
        "shouldFilter",
        "showSearch",
        "importType",
        "importCode",
        "importEncrypted",
        "importPassphrase",
        "importFilePassphrase",
        "unsupportedAccounts",
        "searchText",
        "newAccount",
        "newPassphrase",
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
      AddAccountPage
  }
});
</script>
