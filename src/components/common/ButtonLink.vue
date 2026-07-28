<template>
  <a
    :href="href"
    :download="download"
    :class="{ 'button-small': type === 'small', button: !type }"
    target="_blank"
  >
    <slot></slot>
  </a>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ["type", "href", "download"],
});
</script>
