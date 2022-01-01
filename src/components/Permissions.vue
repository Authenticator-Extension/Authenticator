<template>
  <div id="permissions" class="theme-normal">
    <h1>Permissions</h1>
    <div v-for="permission in permissions" :key="permission.id">
      <h2>{{ permission.id }}</h2>
      <p>{{ permission.description }}</p>
      <button
        :disabled="!permission.revocable"
        v-if="permission.revocable"
        v-on:click="revoke(permission.id)"
      >
        Revoke
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  computed: {
    permissions: function () {
      return this.$store.state.permissions.permissions;
    },
  },
  methods: {
    revoke(permissionId: string) {
      this.$store.commit("permissions/revokePermission", permissionId);
    },
  },
});
</script>
