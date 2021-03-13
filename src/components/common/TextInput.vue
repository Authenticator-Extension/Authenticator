<template>
  <div>
    <label>{{ label }}</label>
    <input
      :type="type ? type : 'text'"
      class="input"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @keyup.enter="$emit('enter')"
      ref="textInput"
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ["label", "value", "type", "autofocus"],
  mounted() {
    if (!this.$props.autofocus) {
      return;
    }
    const textInput = this.$refs.textInput;
    if (textInput instanceof HTMLInputElement) {
      textInput.focus();
    }
  },
});
</script>
