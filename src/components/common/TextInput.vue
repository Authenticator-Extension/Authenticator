<template>
  <div>
    <label>{{ label }}</label>
    <input
      :type="type ? type : 'text'"
      class="input"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @keyup.enter="$emit('enter')"
      autofocus
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ["label", "value", "type"],
});
</script>
