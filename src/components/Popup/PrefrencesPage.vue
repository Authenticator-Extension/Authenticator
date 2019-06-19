<template>
    <div>
        <div>
            <label class="combo-label">{{ i18n.scale }}</label>
            <select v-model="zoom" v-on:change="saveZoom()">
                <option value="125">125%</option>
                <option value="100">100%</option>
                <option value="90">90%</option>
                <option value="80">80%</option>
                <option value="67">67%</option>
                <option value="57">57%</option>
                <option value="50">50%</option>
                <option value="40">40%</option>
                <option value="33">33%</option>
                <option value="25">25%</option>
                <option value="20">20%</option>
            </select>
        </div>
        <div>
            <label class="combo-label">{{ i18n.use_autofill }}</label>
            <input class="checkbox" type="checkbox" v-model="useAutofill" v-on:change="saveAutofill()">
        </div>
        <div>
            <label class="combo-label">{{ i18n.use_high_contrast }}</label>
            <input class="checkbox" type="checkbox" v-model="useHighContrast" v-on:change="saveHighContrast()">
        </div>
        <div class="button" v-on:click="popOut()">{{ i18n.popout }}</div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

export default Vue.extend({
    computed: mapState('menu', ['zoom', 'useAutofill', 'useHighContrast'])
})
</script>
