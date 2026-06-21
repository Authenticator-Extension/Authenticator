<template>
  <div class="import_file">
    <label for="import_file">{{ label }}</label>
    <input
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
});
</script>
