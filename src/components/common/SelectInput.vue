<template>
  <div class="control-group">
    <label class="combo-label" style="margin: 20px 10px">{{ label }}</label>
    <select
      style="margin: 20px 10px"
      :value="value"
      :disabled="disabled"
      @change="onChange"
    >
      <slot></slot>
    </select>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ["label", "value", "disabled"],
  methods: {
    getSelectedValue(event: Event) {
      const target = event.target as HTMLSelectElement;
      const selectedOption = target.options[target.selectedIndex] as
        | (HTMLOptionElement & { _value?: unknown })
        | undefined;
      return selectedOption && "_value" in selectedOption
        ? selectedOption._value
        : target.value;
    },
    onChange(event: Event) {
      this.$emit("input", this.getSelectedValue(event));
      this.$emit("change");
    },
  },
});
</script>
