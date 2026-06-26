<template>
  <div class="import_file">
    <label
      for="import_file"
      :class="{ dragover: isDragover }"
      @dragover.prevent="isDragover = true"
      @dragleave.prevent="isDragover = false"
      @drop.prevent="onDrop"
      >{{ label }}</label
    >
    <input
      ref="input"
      id="import_file"
      type="file"
      v-bind="$attrs"
      :accept="accept"
      :multiple="multiple"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  inheritAttrs: false,
  props: ["label", "multiple", "accept"],
  data() {
    return { isDragover: false };
  },
  methods: {
    onDrop(event: DragEvent) {
      this.isDragover = false;
      const files = event.dataTransfer?.files;
      if (!files || !files.length) {
        return;
      }
      // hand the dropped files to the hidden input and fire change so the
      // parent's @change (e.g. importQr) runs as if they were picked
      const input = this.$refs.input as HTMLInputElement;
      input.files = files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
  },
});
</script>
