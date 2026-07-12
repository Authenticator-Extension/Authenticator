<template>
  <a
    role="button"
    data-x-role="entry"
    v-bind:tabindex="tabindex"
    v-bind:class="{
      entry: true,
      pinnedEntry: entry.pinned,
      'no-copy': noCopy(entry.code),
      matchedEntry: matched,
      dimmed: dimmed,
      notSearched: notSearched,
    }"
    v-on:click="copyCode(entry)"
    v-on:keydown.enter="copyCode(entry)"
    v-on:contextmenu.prevent="openContext($event)"
  >
    <div class="deleteAction" v-on:click="removeEntry(entry)">
      <IconMinusCircle />
    </div>

    <div class="monogram" v-bind:style="monoStyle(entry)">
      {{ monogram(entry) }}
    </div>

    <div class="entry-text">
      <div class="issuer">{{ displayIssuer(entry) }}</div>
      <div class="account">{{ entry.account }}</div>
      <div class="issuerEdit issuerEdit-issuer">
        <input
          v-bind:placeholder="i18n.issuer"
          type="text"
          v-bind:value="entry.issuer"
          v-on:input="setEntryField(entry, 'issuer', $event.target.value)"
          v-on:keydown.stop
          v-on:change="updateIssuer(entry)"
        />
      </div>
      <div class="issuerEdit issuerEdit-account">
        <input
          v-bind:placeholder="i18n.accountName"
          type="text"
          v-bind:value="entry.account"
          v-on:input="setEntryField(entry, 'account', $event.target.value)"
          v-on:keydown.stop
          v-on:change="entry.update()"
        />
      </div>
      <div class="issuerEdit issuerEdit-host">
        <input
          v-bind:placeholder="i18n.host"
          type="text"
          v-bind:value="entry.host"
          v-on:input="setEntryField(entry, 'host', $event.target.value)"
          v-on:keydown.stop
          v-on:change="updateHost(entry)"
        />
      </div>
    </div>

    <div
      v-bind:class="{
        code: true,
        hotp: entry.type === OTPType.hotp || entry.type === OTPType.hhex,
        timeout: entry.period - (second % entry.period) < 5,
      }"
    >
      {{ style.isEditing ? showBulls(entry) : showCode(entry.code) }}
    </div>

    <div class="entry-actions">
      <div
        v-bind:class="{ counter: true, disabled: style.hotpDisabled }"
        v-if="entry.type === OTPType.hotp || entry.type === OTPType.hhex"
        v-on:click="nextCode(entry)"
      >
        <IconRedo />
      </div>
    </div>

    <!-- TOTP countdown: depleting bottom bar + seconds badge -->
    <template v-if="entry.type !== OTPType.hotp && entry.type !== OTPType.hhex">
      <span class="remaining-badge">{{ remaining(entry) }}s</span>
      <div class="timebar">
        <div
          class="timebar-fill"
          v-bind:style="{ width: barPct(entry), background: ringColor(entry) }"
        ></div>
      </div>
    </template>

    <div class="movehandle">
      <IconBars />
    </div>

    <!-- Right-click context menu -->
    <template v-if="contextOpen">
      <div
        class="entry-ctx-backdrop"
        v-on:click.stop="closeContext"
        v-on:contextmenu.prevent.stop="closeContext"
      ></div>
      <div
        class="entry-ctx"
        v-bind:style="{ left: contextX + 'px', top: contextY + 'px' }"
        v-on:click.stop
      >
        <div class="entry-ctx-item" v-on:click.stop="ctxPin">
          <IconPin />
          {{ entry.pinned ? i18n.unpin : i18n.pin_to_top }}
        </div>
        <div
          class="entry-ctx-item"
          v-if="shouldShowQrIcon(entry)"
          v-on:click.stop="ctxShowQr"
        >
          <IconQr />
          {{ i18n.show_qr }}
        </div>
      </div>
    </template>
  </a>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import * as QRGen from "qrcode-generator";
import { OTPEntry, OTPType, CodeState, OTPAlgorithm } from "../../models/otp";
import { EntryStorage } from "../../models/storage";
import {
  getCurrentTab,
  getSiteName,
  getMatchedEntries,
  normalizeHost,
  stripBoundHost,
  okToInjectContentScript,
} from "../../utils";

import IconMinusCircle from "../../../svg/minus-circle.svg";
import IconRedo from "../../../svg/redo.svg";
import IconQr from "../../../svg/qrcode.svg";
import IconBars from "../../../svg/bars.svg";
import IconPin from "../../../svg/pin.svg";

const computedPrototype = [
  mapState("accounts", [
    "OTPType",
    "sectorStart",
    "sectorOffset",
    "second",
    "encryption",
  ]),
  mapState("style", ["style"]),
  mapState("menu", ["theme"]),
];

let computed = {};

for (const module of computedPrototype) {
  Object.assign(computed, module);
}

export default defineComponent({
  computed,
  props: {
    entry: OTPEntry,
    tabindex: Number,
    matched: Boolean,
    dimmed: Boolean,
    notSearched: Boolean,
  },
  data() {
    return {
      contextOpen: false,
      contextX: 0,
      contextY: 0,
    };
  },
  methods: {
    openContext(e: MouseEvent) {
      // No menu while editing (pin is always available, so the menu always opens)
      if (this.$store.state.style.style.isEditing) {
        return;
      }
      const menuW = 180;
      this.contextX = Math.max(
        8,
        Math.min(e.clientX, window.innerWidth - menuW - 8),
      );
      this.contextY = e.clientY;
      this.contextOpen = true;
    },
    closeContext() {
      this.contextOpen = false;
    },
    ctxPin() {
      this.closeContext();
      if (this.entry) {
        this.pin(this.entry);
      }
    },
    ctxShowQr() {
      this.closeContext();
      if (this.entry) {
        this.showQr(this.entry);
      }
    },
    noCopy(code: string) {
      return (
        code === CodeState.Encrypted ||
        code === CodeState.Invalid ||
        code.startsWith("•")
      );
    },
    shouldShowQrIcon(entry: OTPEntry) {
      return (
        !this.$store.state.menu.exportDisabled &&
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
    showBulls(entry: OTPEntry) {
      if (entry.code === CodeState.Encrypted) {
        return this.i18n.encrypted;
      } else if (entry.code === CodeState.Invalid) {
        return this.i18n.invalid;
      }

      if (entry.code.startsWith("•")) {
        return entry.code;
      }

      return new Array(entry.digits).fill("•").join("");
    },
    displayIssuer(entry: OTPEntry) {
      return stripBoundHost(entry.issuer);
    },
    monogram(entry: OTPEntry) {
      const name = stripBoundHost(entry.issuer) || entry.account || "";
      return (name.trim()[0] || "?").toUpperCase();
    },
    monoStyle(entry: OTPEntry) {
      const hue = hueFromString(entry.issuer || entry.account || "");
      return {
        background: `oklch(0.86 0.07 ${hue})`,
        color: `oklch(0.42 0.16 ${hue})`,
      };
    },
    remaining(entry: OTPEntry) {
      const period = entry.period || 30;
      return period - (this.second % period);
    },
    ringColor(entry: OTPEntry) {
      const left = this.remaining(entry);
      if (left > 10) {
        return "var(--ok)";
      }
      if (left > 5) {
        return "var(--warn)";
      }
      return "var(--danger)";
    },
    // Width of the depleting countdown bar (full at refresh, shrinks to ~0).
    barPct(entry: OTPEntry) {
      const period = entry.period || 30;
      return ((this.remaining(entry) / period) * 100).toFixed(1) + "%";
    },
    async removeEntry(entry: OTPEntry) {
      if (
        await this.$store.dispatch(
          "notification/confirm",
          this.i18n.confirm_delete,
        )
      ) {
        await entry.delete();
        await this.$store.dispatch("accounts/deleteCode", entry.hash);
      }
      return;
    },
    async pin(entry: OTPEntry) {
      this.$store.commit("accounts/pinEntry", entry);
      // reordering restarts the timer-circle animation; re-sync its phase
      this.$store.commit("accounts/resyncSector");
      await EntryStorage.set(this.$store.state.accounts.entries);
      const codesEl = document.getElementById("codes") as HTMLDivElement;
      codesEl.scrollTop = 0;
    },
    showQr(entry: OTPEntry) {
      const hue = hueFromString(entry.issuer || entry.account || "");
      this.$store.commit("qr/setQr", {
        src: getQrUrl(entry),
        issuer: stripBoundHost(entry.issuer),
        account: entry.account,
        monogram: this.monogram(entry),
        monoBg: `oklch(0.86 0.07 ${hue})`,
        monoFg: `oklch(0.42 0.16 ${hue})`,
      });
      this.$store.commit("style/showQr");
      return;
    },
    async nextCode(entry: OTPEntry) {
      if (this.$store.state.style.style.hotpDisabled) {
        return;
      }
      this.$store.commit("style/toggleHotpDisabled");
      // entry.next() mutated the store-held entry directly; do the in-memory
      // counter/code change in a mutation, then persist (storage, not state)
      if (entry.type === OTPType.hotp || entry.type === OTPType.hhex) {
        this.$store.commit("accounts/advanceHotpCounter", entry);
        if (entry.secret !== null) {
          await entry.update();
        }
      }
      setTimeout(() => {
        this.$store.commit("style/toggleHotpDisabled");
      }, 3000);
      return;
    },
    setEntryField(
      entry: OTPEntry,
      field: "issuer" | "account" | "host",
      value: string,
    ) {
      this.$store.commit("accounts/setEntryField", { entry, field, value });
    },
    updateHost(entry: OTPEntry) {
      this.$store.commit("accounts/setEntryField", {
        entry,
        field: "host",
        value: normalizeHost(entry.host),
      });
      entry.update();
    },
    async updateIssuer(entry: OTPEntry) {
      if (entry.issuer.includes("::")) {
        // storage only ever holds a previously-accepted (valid) issuer, so
        // reload it from there to restore the pre-edit value and refuse the
        // write, mirroring AddAccountPage's "::" rejection.
        this.$store.commit("notification/alert", this.i18n.errorissuer);
        const stored = (await EntryStorage.get()).find(
          (e) => e.hash === entry.hash,
        );
        this.$store.commit("accounts/setEntryField", {
          entry,
          field: "issuer",
          value: stored ? stored.issuer : "",
        });
        return;
      }
      entry.update();
    },
    async copyCode(entry: OTPEntry) {
      if (
        this.$store.state.style.style.isEditing ||
        entry.code === CodeState.Invalid ||
        entry.code.startsWith("•")
      ) {
        return;
      }

      if (entry.code === CodeState.Encrypted) {
        this.$store.commit("style/showInfo", true);
        this.$store.commit("currentView/changeView", "EnterPasswordPage");
        return;
      }

      chrome.permissions.request(
        { permissions: ["clipboardWrite"] },
        async (granted) => {
          if (granted) {
            const codeClipboard = document.getElementById(
              "codeClipboard",
            ) as HTMLInputElement;
            if (!codeClipboard) {
              return;
            }

            if (this.$store.state.menu.useAutofill) {
              await insertContentScript();
              const tab = await getCurrentTab();
              if (tab && tab.id) {
                // Only inject a live code when the page's real host matches the
                // entry's bound host; otherwise fall through to clipboard copy
                // so a hostile page can't harvest a code it doesn't own.
                const siteName = await getSiteName();
                const matched = getMatchedEntries(siteName, [entry], true);
                if (matched && matched.length === 1) {
                  chrome.tabs.sendMessage(tab.id, {
                    action: "pastecode",
                    code: entry.code,
                  });
                }
              }
            }

            const lastActiveElement = document.activeElement as HTMLElement;
            codeClipboard.value = entry.code;
            codeClipboard.focus();
            codeClipboard.select();
            document.execCommand("Copy");
            lastActiveElement.focus();
            this.$store.dispatch(
              "notification/ephermalMessage",
              this.i18n.copied,
            );
          }
        },
      );

      return;
    },
  },
  components: {
    IconMinusCircle,
    IconRedo,
    IconQr,
    IconBars,
    IconPin,
  },
});

// Stable 0-359 hue from a string (FNV-1a) for monogram avatar tinting.
function hueFromString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

// TODO: move most of this to a models file and reuse for backup stuff
function getQrUrl(entry: OTPEntry) {
  const issuer = stripBoundHost(entry.issuer);
  // Encode issuer and account separately so the "issuer:account" separator
  // stays a literal colon. Encoding the whole label turned it into %3A, which
  // several authenticators (incl. Google) fail to parse. (#1302)
  const label = issuer
    ? encodeURIComponent(issuer) + ":" + encodeURIComponent(entry.account)
    : encodeURIComponent(entry.account);
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
    (issuer || entry.host
      ? "&issuer=" +
        encodeURIComponent(issuer) +
        (entry.host ? "::" + encodeURIComponent(entry.host) : "")
      : "") +
    (entry.type === OTPType.hotp || entry.type === OTPType.hhex
      ? "&counter=" + entry.counter
      : "") +
    (entry.type === OTPType.totp && entry.period !== 30
      ? "&period=" + entry.period
      : "") +
    (entry.digits !== 6 ? "&digits=" + entry.digits : "") +
    (entry.algorithm !== OTPAlgorithm.SHA1
      ? "&algorithm=" + OTPAlgorithm[entry.algorithm]
      : "");
  const qr = QRGen(0, "L");
  qr.addData(otpauth);
  qr.make();
  return qr.createDataURL(5);
}

async function insertContentScript() {
  let tab = await getCurrentTab();
  if (okToInjectContentScript(tab)) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/js/content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["/css/content.css"],
    });
  }
}
</script>
