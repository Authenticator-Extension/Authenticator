<template>
  <div>
    <label>{{ label }}</label>
    <input
      :type="type ? type : 'text'"
      class="input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('enter')"
      ref="textInput"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ["label", "modelValue", "type", "autofocus"],
  emits: ["update:modelValue", "enter"],
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
