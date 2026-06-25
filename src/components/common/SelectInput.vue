<template>
  <div class="control-group">
    <label class="combo-label" style="margin: 20px 10px">{{ label }}</label>
    <select
      style="margin: 20px 10px"
      :value="modelValue"
      :disabled="disabled"
      @input="onInput"
      @change="$emit('change')"
    >
      <slot></slot>
    </select>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  props: {
    label: String,
    modelValue: [String, Number, Boolean],
    disabled: Boolean,
    // Vue 3 passes v-model modifiers (e.g. .number) here for the child to apply
    modelModifiers: {
      type: Object as PropType<{ number?: boolean }>,
      default: () => ({}),
    },
  },
  emits: ["update:modelValue", "change"],
  methods: {
    onInput(event: Event) {
      const value = (event.target as HTMLSelectElement).value;
      this.$emit(
        "update:modelValue",
        this.modelModifiers.number ? Number(value) : value
      );
    },
  },
});
</script>
