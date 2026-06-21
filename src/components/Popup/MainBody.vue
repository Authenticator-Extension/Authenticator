<template>
  <div
    id="codes"
    v-bind:class="{ filter: shouldFilter && filter, search: showSearch }"
  >
    <!-- Filter -->
    <div class="under-header" id="filter" v-on:click="clearFilter()">
      {{ i18n.show_all_entries }}
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
    <draggable
      v-model="draggableEntries"
      item-key="hash"
      handle=".movehandle"
      :disabled="!isEditing"
      v-on:keydown.down="focusNextEntry()"
      v-on:keydown.right="focusNextEntry()"
      v-on:keydown.up="focusLastEntry()"
      v-on:keydown.left="focusLastEntry()"
    >
      <template #item="{ element }">
        <EntryComponent
          v-bind:filtered="!element.pinned && !isMatchedEntry(element)"
          v-bind:notSearched="!isSearchedEntry(element)"
          v-bind:entry="element"
          v-bind:tabindex="getTabindex(element)"
        />
      </template>
    </draggable>
    <div class="no-entry" v-if="entries.length === 0 && initComplete">
      <IconKey />
      <p>
        {{ i18n.no_entires }}
        <a href="#" v-on:click="openLink('https://otp.ee/quickstart')">{{
          i18n.learn_more
        }}</a>
      </p>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import draggable from "vuedraggable";
import { OTPEntry } from "../../models/otp";
import { EntryStorage } from "../../models/storage";

import EntryComponent from "./EntryComponent.vue";

// import IconPlus from "../../../svg/plus.svg";
import IconKey from "../../../svg/key-solid.svg";

export default defineComponent({
  data: function () {
    return {
      searchText: "",
    };
  },
  computed: {
    ...mapState("accounts", ["filter", "showSearch", "initComplete"]),
    ...mapGetters("accounts", ["shouldFilter", "entries"]),
    isEditing(): boolean {
      return this.$store.state.style.style.isEditing;
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
    clearFilter() {
      this.$store.dispatch("accounts/clearFilter");
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
        this.isEntryVisible(entry)
      );

      return entry === firstEntry ? 0 : -1;
    },
    findNextEntryIndex(reverse: boolean) {
      if (document.activeElement?.getAttribute("data-x-role") !== "entry") {
        return -1;
      }

      const activeIndex = Array.prototype.indexOf.call(
        document.querySelectorAll(".entry"),
        document.activeElement
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
          this.isEntryVisible(entry)
      );

      if (nextIndex === -1) {
        nextIndex = _entries.findIndex((entry: OTPEntry) =>
          this.isEntryVisible(entry)
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
    // IconPlus,
    IconKey,
    draggable,
  },
});
</script>
