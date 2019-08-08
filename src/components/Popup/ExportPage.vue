<template>
  <div>
    <div class="text warning" v-if="!encryption.getEncryptionStatus()">
      {{ i18n.export_info }}
    </div>
    <div class="text warning" v-if="unsupportedAccounts">
      {{ i18n.otp_unsupported_warn }}
    </div>
    <a
      download="authenticator.txt"
      v-bind:href="exportOneLineOtpAuthFile"
      v-if="!unsupportedAccounts"
      class="button"
      target="_blank"
      >{{ i18n.download_backup }}</a
    >
    <a
      download="authenticator.json"
      v-bind:href="exportFile"
      class="button"
      target="_blank"
      v-else
      >{{ i18n.download_backup }}</a
    >
    <a
      download="authenticator.json"
      v-bind:href="exportEncryptedFile"
      v-if="encryption.getEncryptionStatus()"
      class="button"
      target="_blank"
      >{{ i18n.download_enc_backup }}</a
    >
    <a class="button" href="import.html" target="_blank">{{
      i18n.import_backup
    }}</a>
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

    return {
      unsupportedAccounts: hasUnsupportedAccounts(exportData),
      exportFile: getBackupFile(exportData),
      exportEncryptedFile: getBackupFile(exportEncData),
      exportOneLineOtpAuthFile: getOneLineOtpBackupFile(exportData)
    };
  },
  computed: {
    encryption: function() {
      return this.$store.state.accounts.encryption;
    }
  }
});

function hasUnsupportedAccounts(exportData: { [h: string]: OTPStorage }) {
  for (const entry of Object.keys(exportData)) {
    if (
      exportData[entry].type === "battle" ||
      exportData[entry].type === "steam"
    ) {
      console.log(exportData[entry]);
      return true;
    }
  }
  return false;
}

function getBackupFile(entryData: { [hash: string]: OTPStorage }) {
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
    otpStorage.issuer = removeUnsafeData(otpStorage.issuer);
    otpStorage.account = removeUnsafeData(otpStorage.account);
    const label = otpStorage.issuer
      ? otpStorage.issuer + ":" + otpStorage.account
      : otpStorage.account;
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
        : "");

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
