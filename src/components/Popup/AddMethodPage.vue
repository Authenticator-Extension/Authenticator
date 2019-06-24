<template>
  <div>
    <div class="button" v-on:click="beginCapture()">{{ i18n.add_qr }}</div>
    <div class="button" v-on:click="addAccountManually()">{{ i18n.add_secret }}</div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
    methods: {
        
    }
})
</script>
