<template>
  <div class="pw-page">
    <div class="page-title">{{ i18n.security }}</div>

    <div class="pw-warning">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        ></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12" y2="17"></line>
      </svg>
      <div>{{ i18n.security_warning }}</div>
    </div>

    <div class="pw-field" v-show="!!defaultEncryption">
      <label>{{ i18n.current_phrase }}</label>
      <input class="pw-input" type="password" v-model="currentPhrase" />
    </div>

    <div class="pw-field">
      <label>{{ i18n.phrase }}</label>
      <input class="pw-input" type="password" v-model="phrase" />
      <div class="pw-strength">
        <span
          v-for="n in 4"
          :key="n"
          class="seg"
          v-bind:style="{
            background:
              n <= pwStrength ? pwStrengthColor : 'var(--border-strong)',
          }"
        ></span>
      </div>
    </div>

    <div class="pw-field">
      <label>{{ i18n.confirm_phrase }}</label>
      <input
        class="pw-input"
        type="password"
        v-model="confirm"
        v-on:keyup.enter="changePassphrase()"
      />
    </div>

    <button class="pw-save" v-on:click="changePassphrase()">
      {{ i18n.ok }}
    </button>
    <button
      class="pw-remove"
      v-show="!enforcePassword && !!defaultEncryption"
      v-on:click="removePassphrase()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
        <path d="M8 11V8a4 4 0 0 1 7-2.6"></path>
      </svg>
      {{ i18n.remove }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { verifyPasswordUsingKeyID } from "../../models/password";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useMenuStore } from "../../store/Menu";
import { useNotificationStore } from "../../store/Notification";
import { useAccountsStore } from "../../store/Accounts";

export default defineComponent({
  data: function () {
    return {
      phrase: "",
      currentPhrase: "",
      confirm: "",
    };
  },
  computed: {
    enforcePassword: function () {
      return useMenuStore().enforcePassword;
    },
    // Rough 0-4 strength score for visual feedback only.
    pwStrength(): number {
      const p = this.phrase;
      if (!p) {
        return 0;
      }
      let s = 0;
      if (p.length >= 8) s++;
      if (p.length >= 12) s++;
      if (/[0-9]/.test(p) && /[a-z]/i.test(p)) s++;
      if (/[^a-z0-9]/i.test(p)) s++;
      return s;
    },
    pwStrengthColor(): string {
      if (this.pwStrength >= 3) {
        return "var(--ok)";
      }
      if (this.pwStrength === 2) {
        return "var(--warn)";
      }
      return "var(--danger)";
    },
    passwordPolicy: function () {
      if (!useMenuStore().passwordPolicy) {
        return null;
      }

      try {
        return new RegExp(useMenuStore().passwordPolicy);
      } catch {
        console.warn(
          "Invalid password policy. The password policy is not a valid regular expression.",
          useMenuStore().passwordPolicy,
        );
        return null;
      }
    },
    passwordPolicyHint: function () {
      return useMenuStore().passwordPolicyHint;
    },
    defaultEncryption: function (): string | undefined {
      return useAccountsStore().defaultEncryption;
    },
  },
  methods: {
    async removePassphrase() {
      useCurrentViewStore().changeView("LoadingPage");

      if (this.defaultEncryption) {
        const isCorrectPassword = await verifyPasswordUsingKeyID(
          this.defaultEncryption,
          this.currentPhrase,
        );
        if (!isCorrectPassword) {
          useNotificationStore().alert(this.i18n.phrase_not_match);
          useCurrentViewStore().changeView("SetPasswordPage");
          return;
        }
      }

      await useAccountsStore().changePassphrase("");
      useNotificationStore().alert(this.i18n.updateSuccess);
      useStyleStore().hideInfo();
      return;
    },
    async changePassphrase() {
      if (this.phrase === "") {
        return;
      }

      if (this.passwordPolicy && !this.passwordPolicy.test(this.phrase)) {
        const hint =
          this.passwordPolicyHint || this.i18n.password_policy_default_hint;
        useNotificationStore().alert(hint);
        return;
      }

      if (this.phrase !== this.confirm) {
        useNotificationStore().alert(this.i18n.phrase_not_match);
        return;
      }

      useCurrentViewStore().changeView("LoadingPage");

      if (this.defaultEncryption) {
        const isCorrectPassword = await verifyPasswordUsingKeyID(
          this.defaultEncryption,
          this.currentPhrase,
        );
        if (!isCorrectPassword) {
          useNotificationStore().alert(this.i18n.phrase_wrong);
          useCurrentViewStore().changeView("SetPasswordPage");
          return;
        }
      }

      await useAccountsStore().changePassphrase(this.phrase);
      useNotificationStore().alert(this.i18n.updateSuccess);
      useStyleStore().hideInfo();
      return;
    },
  },
});
</script>
