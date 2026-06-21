<template>
  <div class="control-group">
    <label class="combo-label">{{ label }}</label>
    <input
      class="checkbox"
      type="checkbox"
      :checked="modelValue"
      @change="onChange"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    label: String,
    modelValue: Boolean,
  },
  emits: ["update:modelValue", "change"],
  methods: {
    onChange(event: Event) {
      const checked = (event.target as HTMLInputElement).checked;
      // update:modelValue drives v-model; change keeps the side-effect handlers
      this.$emit("update:modelValue", checked);
      this.$emit("change", checked);
    },
  },
});
</script>
