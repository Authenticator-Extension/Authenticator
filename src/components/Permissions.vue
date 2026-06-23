<template>
  <div id="permissions" class="theme-auto">
    <div class="perm-card">
      <div class="perm-head">
        <div class="perm-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="4" y="11" width="16" height="10" rx="2.5"></rect>
            <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
          </svg>
        </div>
        <h1>{{ i18n.permissions }}</h1>
      </div>

      <label class="perm-toggle" for="showRequiredPermission">
        <input
          type="checkbox"
          id="showRequiredPermission"
          v-model="showAllPermissions"
        />
        <span>{{ i18n.permission_show_required_permissions }}</span>
      </label>

      <div class="perm-list">
        <div
          class="perm-item"
          v-for="permission in permissions"
          :key="permission.id"
        >
          <div class="perm-item-text">
            <div class="perm-item-id">{{ permission.id }}</div>
            <p>{{ permission.description }}</p>
            <p class="perm-required" v-if="!permission.revocable">
              {{ i18n.permission_required }}
            </p>
          </div>
          <button
            v-if="permission.revocable"
            v-on:click="revoke(permission.id)"
          >
            {{ i18n.permission_revoke }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Permission } from "../models/permission";

export default defineComponent({
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
      this.$store.dispatch("permissions/revokePermission", permissionId);
    },
  },
});
</script>
