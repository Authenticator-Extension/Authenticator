<template>
  <div class="under-header" id="search">
    <input id="searchInput" v-on:keydown="searchUpdate()" v-model="searchText" v-bind:placeholder="i18n.search" type="text">
    <div id="searchHint" v-if="searchText === ''">
      <div></div>
      <div id="searchHintBorder">/</div>
      <div></div>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  computed: mapState("accounts", ["searchText"])
});
</script>
