<template>
  <div>
    <!-- MESSAGE -->
    <div class="message-box" v-show="message.length && messageIdle">
      <div>{{ message.length ? message[0] : "" }}</div>
      <div class="button-small" v-on:click="closeAlert()">{{ i18n.ok }}</div>
    </div>

    <!-- CONFRIM -->
    <div class="message-box" v-show="confirmMessage !== ''">
      <div>{{ confirmMessage }}</div>
      <div class="buttons">
        <div class="button-small" v-on:click="confirmOK()">{{ i18n.yes }}</div>
        <div class="button-small" v-on:click="confirmCancel()">
          {{ i18n.no }}
        </div>
      </div>
    </div>

    <!-- OVERLAY -->
    <div
      id="overlay"
      v-show="(message.length && messageIdle) || confirmMessage !== ''"
    ></div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  computed: mapState("notification", [
    "message",
    "messageIdle",
    "confirmMessage"
  ]),
  methods: {
    closeAlert() {
      this.$store.commit("notification/closeAlert");
    },
    confirmOK() {
      const confirmEvent = new CustomEvent("confirm", { detail: true });
      window.dispatchEvent(confirmEvent);
      return;
    },
    confirmCancel() {
      const confirmEvent = new CustomEvent("confirm", { detail: false });
      window.dispatchEvent(confirmEvent);
      return;
    }
  }
});
</script>
