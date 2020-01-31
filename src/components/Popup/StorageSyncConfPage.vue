<template>
  <div>
    <!-- Storage Settings -->
    <div class="text">{{ i18n.storage_location_info }}</div>
    <label class="combo-label">{{ i18n.storage_location }}</label>
    <select
      v-model="newStorageLocation"
      :disabled="storageArea"
      v-on:change="migrateStorage()"
    >
      <option value="sync">sync</option>
      <option value="local">local</option>
    </select>
    <!-- 3rd Party Backup Services -->
    <div v-show="!backupDisabled" class="text">
      {{ i18n.storage_sync_info }}
    </div>
    <p></p>
    <div
      class="button"
      v-show="!backupDisabled"
      v-on:click="showInfo('DrivePage')"
    >
      Google Drive
    </div>
    <div
      class="button"
      v-show="!backupDisabled"
      v-on:click="showInfo('DropboxPage')"
    >
      Dropbox
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  data: function() {
    return {
      newStorageLocation: this.$store.state.menu.storageArea
        ? this.$store.state.menu.storageArea
        : localStorage.storageLocation
    };
  },
  computed: mapState("menu", ["backupDisabled", "storageArea"]),
  methods: {
    migrateStorage() {
      this.$store
        .dispatch("accounts/migrateStorage", this.newStorageLocation)
        .then(m => {
          this.$store.commit("notification/alert", this.i18n[m]);
        }),
        (r: string) => {
          this.$store.commit("notification/alert", this.i18n.updateFailure + r);
        };
    },
    showInfo(tab: string) {
      if (tab === "DropboxPage") {
        chrome.permissions.request(
          { origins: ["https://*.dropboxapi.com/*"] },
          async granted => {
            if (granted) {
              this.$store.commit("style/showInfo");
              this.$store.commit("currentView/changeView", tab);
            }
          }
        );
        return;
      } else if (tab === "DrivePage") {
        chrome.permissions.request(
          {
            origins: [
              "https://www.googleapis.com/*",
              "https://accounts.google.com/o/oauth2/revoke"
            ]
          },
          async granted => {
            if (granted) {
              this.$store.commit("style/showInfo");
              this.$store.commit("currentView/changeView", tab);
            }
            return;
          }
        );
        return;
      }
    }
  }
});

//   } else if (tab === 'dropbox') {
//     if (
//       localStorage.dropboxEncrypted !== 'true' &&
//       localStorage.dropboxEncrypted !== 'false'
//     ) {
//       localStorage.dropboxEncrypted = 'true';
//       _ui.instance.dropboxEncrypted = localStorage.dropboxEncrypted;
//     }
//   } else if (tab === 'drive') {
//     if (
//       localStorage.driveEncrypted !== 'true' &&
//       localStorage.driveEncrypted !== 'false'
//     ) {
//       localStorage.driveEncrypted = 'true';
//       _ui.instance.driveEncrypted = localStorage.driveEncrypted;
//     }
//   }
</script>
