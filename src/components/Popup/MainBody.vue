<template>
  <div id="codes" v-bind:class="{ search: showSearch }">
    <!-- Smart-filter banner — toggles the site filter on/off -->
    <div id="filter" v-if="showFilterBanner" v-on:click="toggleFilter()">
      <svg
        class="filter-globe"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="9"></circle>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"></path>
      </svg>
      <div class="filter-text">
        <span class="filter-label">{{
          filter ? i18n.showing_codes_for : i18n.filter_to_site
        }}</span>
        <strong class="filter-domain">{{ siteDomain }}</strong>
      </div>
      <span class="filter-showall" v-if="filter">{{
        i18n.show_all_entries
      }}</span>
    </div>
    <!-- Search -->
    <div class="under-header" id="search">
      <input
        id="searchInput"
        v-model="searchText"
        v-bind:placeholder="i18n.search"
        type="text"
        tabindex="-1"
      />
      <div id="searchHint" v-if="searchText === ''">
        <div></div>
        <div id="searchHintBorder">/</div>
        <div></div>
      </div>
    </div>
    <!-- Entries -->
    <!-- Smart-filter view: matched (highlighted) + Other accounts (dimmed) -->
    <div class="entries" v-if="filterActive">
      <EntryComponent
        v-for="element in matchedList"
        v-bind:key="element.hash"
        v-bind:entry="element"
        v-bind:matched="true"
        v-bind:notSearched="!isSearchedEntry(element)"
        v-bind:tabindex="getTabindex(element)"
      />
      <div class="other-accounts" v-if="otherList.length">
        {{ i18n.other_accounts }}
      </div>
      <EntryComponent
        v-for="element in otherList"
        v-bind:key="element.hash"
        v-bind:entry="element"
        v-bind:dimmed="true"
        v-bind:notSearched="!isSearchedEntry(element)"
        v-bind:tabindex="-1"
      />
    </div>
    <VueDraggable
      v-else
      class="entries"
      v-model="draggableEntries"
      handle=".movehandle"
      :disabled="!isEditing"
      v-on:keydown.down="focusNextEntry()"
      v-on:keydown.right="focusNextEntry()"
      v-on:keydown.up="focusLastEntry()"
      v-on:keydown.left="focusLastEntry()"
    >
      <EntryComponent
        v-for="element in draggableEntries"
        v-bind:key="element.hash"
        v-bind:notSearched="!isSearchedEntry(element)"
        v-bind:entry="element"
        v-bind:tabindex="getTabindex(element)"
      />
    </VueDraggable>
    <div class="edit-add" v-if="isEditing" v-on:click="addAccount()">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
      >
        <line x1="12" y1="6" x2="12" y2="18"></line>
        <line x1="6" y1="12" x2="18" y2="12"></line>
      </svg>
      {{ i18n.add_code }}
    </div>
    <div class="no-entry" v-if="entries.length === 0 && initComplete">
      <div class="no-entry-icon" v-on:click="addAccount()">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="12" y1="6" x2="12" y2="18"></line>
          <line x1="6" y1="12" x2="18" y2="12"></line>
        </svg>
      </div>
      <div class="no-entry-title">{{ i18n.no_entires }}</div>
      <p>
        <a href="#" v-on:click="openLink('https://otp.ee/quickstart')">{{
          i18n.learn_more
        }}</a>
      </p>
      <button class="no-entry-add" v-on:click="addAccount()">
        {{ i18n.add_code }}
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import { VueDraggable } from "vue-draggable-plus";
import { OTPEntry } from "../../models/otp";
import { EntryStorage } from "../../models/storage";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";

import EntryComponent from "./EntryComponent.vue";

export default defineComponent({
  data: function () {
    return {
      searchText: "",
    };
  },
  computed: {
    ...mapState("accounts", [
      "filter",
      "showSearch",
      "initComplete",
      "siteName",
    ]),
    ...mapGetters("accounts", ["shouldFilter", "entries"]),
    isEditing(): boolean {
      return useStyleStore().style.isEditing;
    },
    // Smart-filter split: matched (or pinned) accounts vs. everything else.
    matchedList(): OTPEntry[] {
      return this.entries.filter(
        (e: OTPEntry) => e.pinned || this.isMatchedEntry(e),
      );
    },
    otherList(): OTPEntry[] {
      return this.entries.filter(
        (e: OTPEntry) => !e.pinned && !this.isMatchedEntry(e),
      );
    },
    siteDomain(): string {
      return this.siteName?.[2] || this.siteName?.[1] || "";
    },
    // Only offer the filter when it actually segregates the list: there are
    // matches AND non-matching ("other") accounts to hide/reveal.
    showFilterBanner(): boolean {
      return this.shouldFilter && this.otherList.length > 0;
    },
    filterActive(): boolean {
      return this.showFilterBanner && this.filter;
    },
    draggableEntries: {
      get(): OTPEntry[] {
        return this.$store.getters["accounts/entries"];
      },
      set(reordered: OTPEntry[]) {
        this.$store.commit("accounts/reorderEntries", reordered);
        // reordering restarts the timer-circle animation; re-sync its phase
        this.$store.commit("accounts/resyncSector");
        EntryStorage.set(this.$store.state.accounts.entries);
      },
    },
  },
  methods: {
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
    addAccount() {
      let page = "AddMethodPage";
      if (
        this.$store.state.menu.enforcePassword &&
        !this.$store.state.accounts.defaultEncryption
      ) {
        page = "SetPasswordPage";
      }
      useStyleStore().showInfo();
      useCurrentViewStore().changeView(page);
    },
    isMatchedEntry(entry: OTPEntry) {
      for (const hash of this.$store.getters["accounts/matchedEntries"]) {
        if (entry.hash === hash) {
          return true;
        }
      }
      return false;
    },
    isSearchedEntry(entry: OTPEntry) {
      if (this.searchText === "") {
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
    toggleFilter() {
      // clearFilter also reveals search for long lists; startFilter re-applies
      if (this.filter) {
        this.$store.dispatch("accounts/clearFilter");
      } else {
        this.$store.commit("accounts/startFilter");
      }
    },
    isEntryVisible(entry: OTPEntry) {
      return (
        this.isSearchedEntry(entry) &&
        (entry.pinned ||
          !this.shouldFilter ||
          !this.filter ||
          this.isMatchedEntry(entry))
      );
    },
    getTabindex(entry: OTPEntry) {
      const firstEntry = this.entries.find((entry: OTPEntry) =>
        this.isEntryVisible(entry),
      );

      return entry === firstEntry ? 0 : -1;
    },
    findNextEntryIndex(reverse: boolean) {
      if (document.activeElement?.getAttribute("data-x-role") !== "entry") {
        return -1;
      }

      const activeIndex = Array.prototype.indexOf.call(
        document.querySelectorAll(".entry"),
        document.activeElement,
      );
      if (activeIndex === -1) {
        return -1;
      }

      // reverse modify origin array, and use slice() to make a clone first
      const _entries = reverse ? this.entries.slice().reverse() : this.entries;

      let nextIndex = _entries.findIndex(
        (entry: OTPEntry, index: number) =>
          index >
            (reverse ? this.entries.length - 1 - activeIndex : activeIndex) &&
          this.isEntryVisible(entry),
      );

      if (nextIndex === -1) {
        nextIndex = _entries.findIndex((entry: OTPEntry) =>
          this.isEntryVisible(entry),
        );
      }

      return nextIndex;
    },
    focusNextEntry() {
      const nextIndex = this.findNextEntryIndex(false);
      document
        .querySelector<HTMLLinkElement>(`.entry:nth-child(${nextIndex + 1})`)
        ?.focus();
    },
    focusLastEntry() {
      const lastIndex = this.entries.length - 1 - this.findNextEntryIndex(true);
      document
        .querySelector<HTMLLinkElement>(`.entry:nth-child(${lastIndex + 1})`)
        ?.focus();
    },
  },
  components: {
    EntryComponent,
    VueDraggable,
  },
});
</script>
