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
import Vue from "vue";

export default Vue.extend({
  props: ["type", "href", "download"],
});
</script>
