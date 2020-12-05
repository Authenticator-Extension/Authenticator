<template>
  <div>
    <div v-show="!exportDisabled">
      <div class="text warning" v-if="!encryption.getEncryptionStatus()">
        {{ i18n.export_info }}
      </div>
      <div class="text warning" v-if="unsupportedAccounts">
        {{ i18n.otp_unsupported_warn }}
      </div>
      <div class="text warning" v-if="currentlyEncrypted">
        {{ i18n.phrase_incorrect_export }}
      </div>
      <a-button-link
        download="authenticator.txt"
        :href="exportOneLineOtpAuthFile"
        v-if="!unsupportedAccounts"
        >{{ i18n.download_backup }}</a-button-link
      >
      <a-button-link download="authenticator.json" :href="exportFile" v-else>{{
        i18n.download_backup
      }}</a-button-link>
      <a-button-link
        download="authenticator.json"
        :href="exportEncryptedFile"
        v-if="encryption.getEncryptionStatus()"
        >{{ i18n.download_enc_backup }}</a-button-link
      >
    </div>
    <a-button-link href="import.html">{{ i18n.import_backup }}</a-button-link>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import { Encryption } from "../../models/encryption";
import { EntryStorage } from "../../models/storage";
import * as CryptoJS from "crypto-js";

export default Vue.extend({
  data: function() {
    const exportData = this.$store.state.accounts.exportData;
    const exportEncData = this.$store.state.accounts.exportEncData;
    const key = this.$store.state.accounts.key;

    return {
      unsupportedAccounts: hasUnsupportedAccounts(exportData),
      exportFile: getBackupFile(exportData),
      exportEncryptedFile: getBackupFile(exportEncData, key),
      exportOneLineOtpAuthFile: getOneLineOtpBackupFile(exportData),
      currentlyEncrypted: this.$store.getters["accounts/currentlyEncrypted"]
    };
  },
  computed: {
    encryption: function() {
      return this.$store.state.accounts.encryption;
    },
    exportDisabled: function() {
      return this.$store.state.menu.exportDisabled;
    }
  }
});

function hasUnsupportedAccounts(exportData: { [h: string]: OTPStorage }) {
  for (const entry of Object.keys(exportData)) {
    if (
      exportData[entry].type === "battle" ||
      exportData[entry].type === "steam"
    ) {
      return true;
    }
  }
  return false;
}

function getBackupFile(
  entryData: { [hash: string]: OTPStorage },
  key?: Object
) {
  if (key) {
    Object.assign(entryData, { key: key });
  }
  let json = JSON.stringify(entryData, null, 2);
  // for windows notepad
  json = json.replace(/\n/g, "\r\n");
  const base64Data = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(json)
  );
  return `data:application/octet-stream;base64,${base64Data}`;
}

function getOneLineOtpBackupFile(entryData: { [hash: string]: OTPStorage }) {
  const otpAuthLines: string[] = [];
  for (const hash of Object.keys(entryData)) {
    const otpStorage = entryData[hash];
    if (otpStorage.issuer) {
      otpStorage.issuer = removeUnsafeData(otpStorage.issuer);
    }
    if (otpStorage.account) {
      otpStorage.account = removeUnsafeData(otpStorage.account);
    }
    const label = otpStorage.issuer
      ? otpStorage.issuer + ":" + (otpStorage.account || "")
      : otpStorage.account || "";
    let type = "";
    if (otpStorage.type === "totp" || otpStorage.type === "hex") {
      type = "totp";
    } else if (otpStorage.type === "hotp" || otpStorage.type === "hhex") {
      type = "hotp";
    } else {
      continue;
    }

    const otpAuthLine =
      "otpauth://" +
      type +
      "/" +
      label +
      "?secret=" +
      otpStorage.secret +
      (otpStorage.issuer ? "&issuer=" + otpStorage.issuer : "") +
      (type === "hotp" ? "&counter=" + otpStorage.counter : "") +
      (type === "totp" && otpStorage.period
        ? "&period=" + otpStorage.period
        : "") +
      (otpStorage.digits ? "&digits=" + otpStorage.digits : "") +
      (otpStorage.algorithm ? "&algorithm=" + otpStorage.algorithm : "");

    otpAuthLines.push(otpAuthLine);
  }

  const base64Data = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(otpAuthLines.join("\r\n"))
  );
  return `data:application/octet-stream;base64,${base64Data}`;
}

function removeUnsafeData(data: string) {
  return encodeURIComponent(data.split("::")[0].replace(/:/g, ""));
}
</script>
