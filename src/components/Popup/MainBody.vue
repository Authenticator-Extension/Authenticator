<template>
    <div id="codes" v-bind:class="{'timeout': style.timeout && !style.isEditing, 'edit': style.isEditing, 'filter': shouldFilter && filter, 'search': showSearch}">
        <div class="under-header" id="filter" v-on:click="clearFilter()">{{ i18n.show_all_entries }}</div>
        <SearchBox />
        <div v-dragula="entries" drake="entryDrake">
            <div class="entry" v-for="entry in entries" :key="entry.hash" v-bind:filtered="!isMatchedEntry(entry)" v-bind:notSearched="!isSearchedEntry(entry)">
                <EntryComponent />
            </div>
        </div>
        <div class="icon" id="add" v-on:click="showInfo('account')"><IconPlus /></div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex';

import SearchBox from './SearchBox.vue'
import EntryComponent from './EntryComponent.vue'

import IconPlus from '../../../svg/plus.svg'

const computedPrototype = [
    mapState('style', ['style']),
    mapState('accounts', ["entries", "shouldFilter", "showSearch"])
]

let computed = {};

for (const module of computedPrototype) {
    Object.assign(computed, module);
}

export default Vue.extend({
    computed,
    components: {
        SearchBox,
        EntryComponent,
        IconPlus
    }
})
</script>
