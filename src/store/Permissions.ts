import { defineStore } from "pinia";
import { ref } from "vue";
import { Permission } from "../models/permission";
import { UserSettings } from "../models/settings";

const permissionDefinitions: Permission[] = [
  {
    id: "activeTab",
    description: chrome.i18n.getMessage("permission_active_tab"),
    revocable: false,
  },
  {
    id: "storage",
    description: chrome.i18n.getMessage("permission_storage"),
    revocable: false,
  },
  {
    id: "identity",
    description: chrome.i18n.getMessage("permission_identity"),
    revocable: false,
  },
  {
    id: "alarms",
    description: chrome.i18n.getMessage("permission_alarms"),
    revocable: false,
  },
  {
    id: "scripting",
    description: chrome.i18n.getMessage("permission_scripting"),
    revocable: false,
  },
  {
    id: "clipboardWrite",
    description: chrome.i18n.getMessage("permission_clipboard_write"),
    revocable: true,
  },
  {
    id: "contextMenus",
    description: chrome.i18n.getMessage("permission_context_menus"),
    revocable: true,
  },
  {
    id: "https://www.google.com/*",
    description: chrome.i18n.getMessage("permission_sync_clock"),
    revocable: true,
  },
  {
    id: "https://*.dropboxapi.com/*",
    description: chrome.i18n.getMessage("permission_dropbox"),
    revocable: true,
    validation: [
      async () => {
        await UserSettings.updateItems();
        if (UserSettings.items.dropboxToken !== undefined) {
          return {
            valid: false,
            message: chrome.i18n.getMessage("permission_dropbox_cannot_revoke"),
          };
        }
        return {
          valid: true,
        };
      },
    ],
  },
];

function getPermissionById(permissionId: string): Permission {
  const permissionObject = permissionDefinitions.find(
    (p) => p.id === permissionId,
  );

  if (permissionObject === undefined) {
    return new Permission({
      id: permissionId,
      description: chrome.i18n.getMessage("permission_unknown_permission"),
      revocable: true,
    });
  }

  return permissionObject;
}

async function getPermissions(): Promise<Permission[]> {
  return new Promise((resolve: (permissions: Permission[]) => void) => {
    chrome.permissions.getAll((permissions: chrome.permissions.Permissions) => {
      const permissionList: Permission[] = [];

      for (const permissionId of permissions.permissions ?? []) {
        permissionList.push(getPermissionById(permissionId));
      }

      for (const permissionId of permissions.origins ?? []) {
        permissionList.push(getPermissionById(permissionId));
      }

      permissionList.sort((a, b) => {
        return a.revocable !== b.revocable ? (a.revocable ? 1 : -1) : 0;
      });

      return resolve(permissionList);
    });
  });
}

async function removePermission(permissionId: string): Promise<void> {
  return new Promise((resolve: () => void) => {
    chrome.permissions.getAll((permissions: chrome.permissions.Permissions) => {
      for (const _permissionId of permissions.permissions ?? []) {
        if (_permissionId === permissionId) {
          chrome.permissions.remove({ permissions: [permissionId] }, () => {
            resolve();
          });
          return;
        }
      }

      for (const _permissionId of permissions.origins ?? []) {
        if (_permissionId === permissionId) {
          chrome.permissions.remove({ origins: [permissionId] }, () => {
            resolve();
          });
          return;
        }
      }

      // nothing matched -> nothing to remove
      resolve();
    });
  });
}

export const usePermissionsStore = defineStore("permissions", () => {
  const permissions = ref<Permission[]>([]);

  // Populates state from chrome.permissions; the caller must await this
  // before the popup mounts so components never observe the empty default.
  async function init() {
    permissions.value = await getPermissions();
  }

  async function revokePermission(permissionId: string) {
    const permissionObject = getPermissionById(permissionId);
    const validators = permissionObject.validation ?? [];
    const validationResults = (
      await Promise.all(validators.map(async (validator) => await validator()))
    ).filter((result) => !result.valid);

    if (validationResults.length > 0) {
      const messages = validationResults.map((result) => "• " + result.message);
      alert(messages.join("\n"));
      return;
    }

    await removePermission(permissionId);
    permissions.value = await getPermissions();
  }

  return { permissions, init, revokePermission };
});
