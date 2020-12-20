<template>
  <div class="import_file">
    <label for="import_file">{{ label }}</label>
    <input
      id="import_file"
      type="file"
      v-on="$listeners"
      :accept="accept"
      :multiple="multiple"
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: ["label", "multiple", "accept"],
});
</script>
