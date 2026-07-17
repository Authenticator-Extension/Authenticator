<template>
  <div class="manual-form">
    <div class="page-title">{{ i18n.add_secret }}</div>

    <div class="field">
      <label class="field-label">{{ i18n.issuer }}</label>
      <input class="field-input" v-model="newAccount.issuer" />
    </div>

    <div class="field">
      <label class="field-label">{{ i18n.host }}</label>
      <input
        class="field-input"
        v-model="newAccount.host"
        placeholder="example.com"
      />
    </div>

    <div class="field">
      <label class="field-label">{{ i18n.secret }}</label>
      <input class="field-input mono" v-model="newAccount.secret" />
    </div>

    <div class="field">
      <label class="field-label">{{ i18n.type }}</label>
      <select class="field-input" v-model.number="newAccount.type">
        <option :value="OTPType.totp">{{ i18n.based_on_time }}</option>
        <option :value="OTPType.hotp">{{ i18n.based_on_counter }}</option>
        <option :value="OTPType.battle">Battle.net</option>
        <option :value="OTPType.steam">Steam</option>
      </select>
    </div>

    <details class="advanced">
      <summary>{{ i18n.advanced }}</summary>
      <div class="field">
        <label class="field-label">{{ i18n.accountName }}</label>
        <input class="field-input" v-model="newAccount.account" />
      </div>
      <div class="field">
        <label class="field-label">{{ i18n.period }}</label>
        <input
          class="field-input"
          type="number"
          min="1"
          v-model.number="newAccount.period"
          :disabled="newAccount.type === OTPType.hotp"
        />
      </div>
      <div class="field">
        <label class="field-label">{{ i18n.digits }}</label>
        <select class="field-input" v-model.number="newAccount.digits">
          <option value="6">6</option>
          <option value="8">8</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">{{ i18n.algorithm }}</label>
        <select class="field-input" v-model.number="newAccount.algorithm">
          <option :value="OTPAlgorithm.SHA1">SHA-1</option>
          <option :value="OTPAlgorithm.SHA256">SHA-256</option>
          <option :value="OTPAlgorithm.SHA512">SHA-512</option>
          <option :value="OTPAlgorithm.GOST3411_2012_256">
            GOST 34.11 256
          </option>
          <option :value="OTPAlgorithm.GOST3411_2012_512">
            GOST 34.11 512
          </option>
        </select>
      </div>
    </details>

    <button class="add-submit" v-on:click="addNewAccount()">
      {{ i18n.add_code }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { OTPType, OTPEntry, OTPAlgorithm } from "../../models/otp";
import { normalizeHost } from "../../utils";
import { useStyleStore } from "../../store/Style";
import { useNotificationStore } from "../../store/Notification";

export default defineComponent({
  data: function (): {
    newAccount: {
      issuer: string;
      host: string;
      account: string;
      secret: string;
      type: OTPType;
      period: number | undefined;
      digits: number;
      algorithm: OTPAlgorithm;
    };
  } {
    return {
      newAccount: {
        issuer: "",
        host: "",
        account: "",
        secret: "",
        type: OTPType.totp,
        period: undefined,
        digits: 6,
        algorithm: OTPAlgorithm.SHA1,
      },
    };
  },
  computed: mapState("accounts", ["OTPType", "OTPAlgorithm"]),
  methods: {
    async addNewAccount() {
      if (this.newAccount.issuer.includes("::")) {
        useNotificationStore().alert(this.i18n.errorissuer);
        return;
      }

      this.newAccount.secret = this.newAccount.secret.replace(/ /g, "");

      if (this.newAccount.secret.length < 16) {
        useNotificationStore().alert(this.i18n.errorsecret);
        return;
      }

      if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        !/^[0-9a-f]+$/i.test(this.newAccount.secret)
      ) {
        useNotificationStore().alert(this.i18n.errorsecret);
        return;
      }
      let type: OTPType;
      if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        /^[0-9a-f]+$/i.test(this.newAccount.secret) &&
        this.newAccount.type === OTPType.totp
      ) {
        type = OTPType.hex;
      } else if (
        !/^[a-z2-7]+=*$/i.test(this.newAccount.secret) &&
        /^[0-9a-f]+$/i.test(this.newAccount.secret) &&
        this.newAccount.type === OTPType.hotp
      ) {
        type = OTPType.hhex;
      } else {
        type = this.newAccount.type;
      }

      if (type === OTPType.hhex || type === OTPType.hotp) {
        this.newAccount.period = undefined;
      } else if (
        typeof this.newAccount.period !== "number" ||
        this.newAccount.period < 1
      ) {
        this.newAccount.period = undefined;
      }

      const defaultEncyptionKey = this.$store.state.accounts.defaultEncryption;
      const encryption =
        this.$store.state.accounts.encryption.get(defaultEncyptionKey);

      const entry = new OTPEntry(
        {
          type,
          index: 0,
          issuer: this.newAccount.issuer,
          host: normalizeHost(this.newAccount.host),
          account: this.newAccount.account,
          encrypted: false,
          secret: this.newAccount.secret,
          counter: 0,
          period: this.newAccount.period,
          digits: this.newAccount.digits,
          algorithm: this.newAccount.algorithm,
        },
        encryption,
      );

      try {
        await entry.create();
      } catch (error) {
        // e.g. sync storage full — don't show a phantom entry that wasn't saved
        useNotificationStore().alert(
          error instanceof Error ? error.message : String(error),
        );
        return;
      }
      await this.$store.dispatch("accounts/addCode", entry);
      useStyleStore().hideInfo();
      useStyleStore().toggleEdit();

      const codes = document.getElementById("codes");
      if (codes) {
        // wait vue apply changes to dom
        setTimeout(() => {
          codes.scrollTop = 0;
        }, 0);
      }
      return;
    },
  },
});
</script>
