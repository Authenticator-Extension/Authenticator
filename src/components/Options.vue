<template>
  <div class="theme-auto">
    <div class="options-card">
      <h2>{{ i18n.delete_all }}</h2>
      <p>{{ i18n.delete_all_warning }}</p>
      <input type="checkbox" id="checkbox" v-model="deleteConfirm" />
      <label for="checkbox">{{ i18n.confirm_delete_all }}</label>
      <br />
      <br />
      <button v-on:click="deleteEverything()" v-bind:disabled="!deleteConfirm">
        {{ i18n.delete_all }}
      </button>
      <br />
      <p v-show="deleteComplete">{{ i18n.updateSuccess }}</p>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  data: function () {
    return {
      deleteConfirm: false,
      deleteComplete: false,
    };
  },
  methods: {
    async deleteEverything() {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      localStorage.clear();
      chrome.runtime.sendMessage({ action: "lock" });
      this.deleteConfirm = false;
      this.deleteComplete = true;
    },
  },
});
</script>
