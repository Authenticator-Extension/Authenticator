<template>
  <div>
    <div class="deleteAction" v-on:click="removeEntry(entry)">
      <IconMinusCircle />
    </div>
    <div
      class="sector"
      v-if="entry.type !== OTPType.hotp && entry.type !== OTPType.hhex"
      v-show="sectorStart"
    >
      <svg viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r="4"
          v-bind:style="{
            animationDuration: entry.period + 's',
            animationDelay: (sectorOffset % entry.period) + 's'
          }"
        />
      </svg>
    </div>
    <div
      v-bind:class="{ counter: true, disabled: style.hotpDiabled }"
      v-if="entry.type === OTPType.hotp || entry.type === OTPType.hhex"
      v-on:click="nextCode(entry)"
    >
      <IconRedo />
    </div>
    <div class="issuer">{{ entry.issuer.split("::")[0] }}</div>
    <div class="issuerEdit">
      <input
        v-bind:placeholder="i18n.issuer"
        type="text"
        v-model="entry.issuer"
        v-on:change="entry.update(encryption)"
      />
    </div>
    <div
      v-bind:class="{
        code: true,
        hotp: entry.type === OTPType.hotp || entry.type === OTPType.hhex,
        'no-copy': noCopy(entry.code),
        timeout: entry.period - (second % entry.period) < 5
      }"
      v-on:click="copyCode(entry)"
      v-html="style.isEditing ? showBulls(entry.code) : showCode(entry.code)"
    ></div>
    <div class="issuer">{{ entry.account }}</div>
    <div class="issuerEdit">
      <input
        v-bind:placeholder="i18n.accountName"
        type="text"
        v-model="entry.account"
        v-on:change="entry.update(encryption)"
      />
    </div>
    <div
      class="showqr"
      v-if="shouldShowQrIcon(entry)"
      v-on:click="showQr(entry)"
    >
      <IconQr />
    </div>
    <div class="movehandle">
      <IconBars />
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import * as QRGen from "qrcode-generator";
import { OTPEntry, OTPType, CodeState } from "../../models/otp";

import IconMinusCircle from "../../../svg/minus-circle.svg";
import IconRedo from "../../../svg/redo.svg";
import IconQr from "../../../svg/qrcode.svg";
import IconBars from "../../../svg/bars.svg";

const computedPrototype = [
  mapState("accounts", [
    "OTPType",
    "sectorStart",
    "sectorOffset",
    "second",
    "encryption"
  ]),
  mapState("style", ["style"])
];

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
      return (
        code === CodeState.Encrypted ||
        code === CodeState.Invalid ||
        code.startsWith("&bull;")
      );
    },
    shouldShowQrIcon(entry: OTPEntry) {
      return (
        entry.secret !== null &&
        entry.type !== OTPType.battle &&
        entry.type !== OTPType.steam
      );
    },
    showCode(code: string) {
      if (code === CodeState.Encrypted) {
        return this.i18n.encrypted;
      } else if (code === CodeState.Invalid) {
        return this.i18n.invalid;
      } else {
        return code;
      }
    },
    showBulls(code: string) {
      if (code.startsWith("&bull;")) {
        return code;
      }
      return new Array(code.length).fill("&bull;").join("");
    },
    async removeEntry(entry: OTPEntry) {
      if (
        await this.$store.dispatch(
          "notification/confirm",
          this.i18n.confirm_delete
        )
      ) {
        await entry.delete();
        await this.$store.dispatch("accounts/updateEntries");
      }
      return;
    },
    showQr(entry: OTPEntry) {
      this.$store.commit("qr/setQr", getQrUrl(entry));
      this.$store.commit("style/showQr");
      return;
    },
    async nextCode(entry: OTPEntry) {
      if (this.$store.state.style.hotpDisabled) {
        return;
      }
      this.$store.commit("style/toggleHotpDisabled");
      await entry.next(this.$store.state.accounts.encryption);
      setTimeout(() => {
        this.$store.commit("style/toggleHotpDisabled");
      }, 3000);
      return;
    },
    async copyCode(entry: OTPEntry) {
      if (
        this.$store.state.style.style.isEditing ||
        entry.code === CodeState.Invalid ||
        entry.code.startsWith("&bull;")
      ) {
        return;
      }

      if (entry.code === CodeState.Encrypted) {
        this.$store.commit("style/showInfo");
        this.$store.commit("currentView/changeView", "EnterPasswordPage");
        return;
      }

      chrome.permissions.request(
        { permissions: ["clipboardWrite"] },
        async granted => {
          if (granted) {
            const codeClipboard = document.getElementById(
              "codeClipboard"
            ) as HTMLInputElement;
            if (!codeClipboard) {
              return;
            }

            if (this.$store.state.menu.useAutofill) {
              await insertContentScript();

              chrome.tabs.query(
                { active: true, lastFocusedWindow: true },
                tabs => {
                  const tab = tabs[0];
                  if (!tab || !tab.id) {
                    return;
                  }

                  chrome.tabs.sendMessage(tab.id, {
                    action: "pastecode",
                    code: entry.code
                  });
                }
              );
            }

            codeClipboard.value = entry.code;
            codeClipboard.focus();
            codeClipboard.select();
            document.execCommand("Copy");
            this.$store.dispatch(
              "notification/ephermalMessage",
              this.i18n.copied
            );
          }
        }
      );

      return;
    }
  },
  components: {
    IconMinusCircle,
    IconRedo,
    IconQr,
    IconBars
  }
});

// TODO: move most of this to a models file and reuse for backup stuff
function getQrUrl(entry: OTPEntry) {
  const label = entry.issuer
    ? entry.issuer + ":" + entry.account
    : entry.account;
  const type =
    entry.type === OTPType.hex
      ? OTPType[OTPType.totp]
      : entry.type === OTPType.hhex
      ? OTPType[OTPType.hotp]
      : OTPType[entry.type];
  const otpauth =
    "otpauth://" +
    type +
    "/" +
    label +
    "?secret=" +
    entry.secret +
    (entry.issuer ? "&issuer=" + entry.issuer.split("::")[0] : "") +
    (entry.type === OTPType.hotp || entry.type === OTPType.hhex
      ? "&counter=" + entry.counter
      : "") +
    (entry.type === OTPType.totp && entry.period
      ? "&period=" + entry.period
      : "");
  const qr = QRGen(0, "L");
  qr.addData(otpauth);
  qr.make();
  return qr.createDataURL(5);
}

function insertContentScript() {
  return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
    try {
      return chrome.tabs.executeScript({ file: "/dist/content.js" }, () => {
        chrome.tabs.insertCSS({ file: "/css/content.css" }, resolve);
      });
    } catch (error) {
      return reject(error);
    }
  });
}
</script>
