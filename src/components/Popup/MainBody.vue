<template>
    <div id="codes" v-bind:class="{'filter': shouldFilter && filter, 'search': showSearch}">
        <div class="under-header" id="filter" v-on:click="clearFilter()">{{ i18n.show_all_entries }}</div>
        <SearchBox />
        <div v-dragula="entries" drake="entryDrake">
            <EntryComponent class="entry" v-for="entry in entries" :key="entry.hash" 
             v-bind:filtered="!isMatchedEntry(entry)" v-bind:notSearched="!isSearchedEntry(entry)" v-bind:entry="entry" />
        </div>
        <div class="icon" id="add" v-on:click="showInfo('AddMethodPage')"><IconPlus /></div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex';

import SearchBox from './SearchBox.vue';
import EntryComponent from './EntryComponent.vue';

import IconPlus from '../../../svg/plus.svg';
import { OTPEntry } from '../../models/otp';

let computed = mapState('accounts', ["entries", "filter", "showSearch"]);

Object.assign(computed, mapGetters('accounts', ['shouldFilter']));

export default Vue.extend({
    computed,
    methods: {
        showInfo(page: string) {
            this.$store.commit('style/showInfo');
            this.$store.commit('currentView/changeView', page);
        },
        isMatchedEntry(entry: OTPEntry) {
            for (const hash of this.$store.getters['accounts/matchedEntries']) {
                if (entry.hash === hash) {
                    return true;
                }
            }
            return false;
        },
        // TODO
        isSearchedEntry(entry: OTPEntry) {
            return true;
        },
        clearFilter() {
            this.$store.dispatch('accounts/clearFilter');
      },
    },
    components: {
        SearchBox,
        EntryComponent,
        IconPlus
    }
});
</script>
