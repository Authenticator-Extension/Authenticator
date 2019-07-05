<template>
    <div id="codes" v-bind:class="{'filter': shouldFilter && filter, 'search': showSearch}">
        <!-- Filter -->
        <div class="under-header" id="filter" v-on:click="clearFilter()">{{ i18n.show_all_entries }}</div>
        <!-- Search -->
        <div class="under-header" id="search">
            <input id="searchInput" v-model="searchText" v-bind:placeholder="i18n.search" type="text">
            <div id="searchHint" v-if="searchText === ''">
                <div></div>
                <div id="searchHintBorder">/</div>
                <div></div>
            </div>
        </div>
        <!-- Entries -->
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
import { OTPEntry } from '../../models/otp';

import EntryComponent from './EntryComponent.vue';

import IconPlus from '../../../svg/plus.svg';

let computed = mapState('accounts', ["entries", "filter", "showSearch"]);

Object.assign(computed, mapGetters('accounts', ['shouldFilter']));

export default Vue.extend({
    data: function () {
        return {
            searchText: ''
        }
    },
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
        isSearchedEntry(entry: OTPEntry) {
            if (this.searchText === '') {
                return true;
            }
            if (
                entry.issuer.toLowerCase().includes(this.searchText.toLowerCase()) ||
                entry.account.toLowerCase().includes(this.searchText.toLowerCase())
            ) {
                return true;
            } else {
                return false;
            }
        },
        clearFilter() {
            this.$store.dispatch('accounts/clearFilter');
      },
    },
    components: {
        EntryComponent,
        IconPlus
    }
});
</script>
