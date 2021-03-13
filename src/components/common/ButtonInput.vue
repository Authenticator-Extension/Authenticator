<template>
  <button
    :class="{ 'button-small': type === 'small', button: !type }"
    v-on="$listeners"
  >
    <slot></slot>
  </button>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ["type"],
});
</script>
