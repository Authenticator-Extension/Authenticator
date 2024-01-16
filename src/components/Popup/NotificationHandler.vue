<template>
  <div>
    <!-- MESSAGE -->
    <div class="message-box" v-show="message.length && messageIdle">
      <div>{{ message.length ? message[0] : "" }}</div>
      <a-button type="small" @click="closeAlert()">{{ i18n.ok }}</a-button>
    </div>

    <!-- CONFIRM -->
    <div class="message-box" v-show="confirmMessage !== ''">
      <div>{{ confirmMessage }}</div>
      <div class="buttons">
        <a-button type="small" @click="confirmOK()">{{ i18n.yes }}</a-button>
        <a-button type="small" @click="confirmCancel()">
          {{ i18n.no }}
        </a-button>
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
    "confirmMessage",
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
    },
  },
});
</script>
