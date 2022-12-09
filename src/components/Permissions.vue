<template>
  <div id="permissions" class="theme-normal">
    <h1>Permissions</h1>
    <div>
      <input
        type="checkbox"
        id="showRequiredPermission"
        v-model="showAllPermissions"
      />
      <label for="showRequiredPermission">{{
        i18n.permission_show_required_permissions
      }}</label>
    </div>
    <div v-for="permission in permissions" :key="permission.id">
      <h2>{{ permission.id }}</h2>
      <p>{{ permission.description }}</p>
      <p v-if="!permission.revocable">{{ i18n.permission_required }}</p>
      <button
        :disabled="!permission.revocable"
        v-if="permission.revocable"
        v-on:click="revoke(permission.id)"
      >
        {{ i18n.permission_revoke }}
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Permission } from "../models/permission";

export default Vue.extend({
  computed: {
    permissions: function () {
      return this.$store.state.permissions.permissions.filter(
        (permission: Permission) => {
          return this.showAllPermissions || permission.revocable;
        }
      );
    },
  },
  data: function () {
    return {
      showAllPermissions: false,
    };
  },
  methods: {
    revoke(permissionId: string) {
      this.$store.commit("permissions/revokePermission", permissionId);
    },
  },
});
</script>
