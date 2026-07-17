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
import { defineComponent } from "vue";
import { mapState } from "pinia";
import { useNotificationStore } from "../../store/Notification";

export default defineComponent({
  computed: mapState(useNotificationStore, [
    "message",
    "messageIdle",
    "confirmMessage",
  ]),
  methods: {
    closeAlert() {
      useNotificationStore().closeAlert();
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
