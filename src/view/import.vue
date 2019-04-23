<template>
    <div id="import">
        <div v-if="!shouldShowPassphrase">
            <div class="import_tab">
                <input type="radio" id="import_file_radio" value="import_file" v-model="importType">
                <label for="import_file_radio">{{ i18n.import_backup_file }}</label>
                <input type="radio" id="import_code_radio" value="import_code" v-model="importType">
                <label for="import_code_radio">{{ i18n.import_backup_code }}</label>
            </div>
            <div>
                <p id="import_info">{{ i18n.otp_backup_inform }} <a
                        href="https://authenticator.cc/docs/en/otp-backup"
                        target="_blank"> {{ i18n.otp_backup_learn }}</a></p>
            </div>
            <div v-show="importType === 'import_file'">
                <div class="import_file" v-if="!getFilePassphrase">
                    <label for="import_file">{{ i18n.import_backup_file }}</label>
                    <input id="import_file" type="file" v-on:change="importFile($event, true)"
                        accept="application/json, text/plain"></input>
                </div>
                <div class="import_file_passphrase" v-else>
                    <p class="error_password">{{ i18n.passphrase_info }}</p>
                    <div class="import_file_passphrase_input">
                        <label style="text-align: left;">{{ i18n.phrase }}</label>
                        <!-- trigger here -->
                        <input type="password" v-on:keyup.enter="readFilePassphrase = true"
                            v-model="importFilePassphrase">
                    </div>
                    <!-- trigger here -->
                    <button v-on:click="readFilePassphrase = true">{{ i18n.ok }}</button>
                </div>
            </div>
            <div v-show="importType === 'import_code'">
                <div class="import_code">
                    <textarea spellcheck="false" v-model="importCode"></textarea>
                </div>
                <div class="import_encrypted">
                    <input type="checkbox" id="encryptedCode" v-model="importEncrypted">
                    <label for="encryptedCode">{{ i18n.encrypted }}</label>
                </div>
                <div class="import_passphrase" v-show="importEncrypted">
                    <label for="import_passphrase">{{ i18n.phrase }}</label>
                    <input id="import_passphrase" type="password" v-model="importPassphrase">
                </div>
                <button v-on:click="importBackupCode()">{{ i18n.import_backup_code }}</button>
            </div>
        </div>
        <div v-if="shouldShowPassphrase" class="error_password">{{ i18n.import_error_password }}</div>
    </div>
</template>
