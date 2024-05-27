import { Permission } from "../models/permission";
import { UserSettings } from "../models/settings";

const permissions: Permission[] = [
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
  {
    id: "https://www.googleapis.com/*",
    description: chrome.i18n.getMessage("permission_drive"),
    revocable: true,
    validation: [
      async () => {
        await UserSettings.updateItems();
        if (UserSettings.items.driveToken !== undefined) {
          return {
            valid: false,
            message: chrome.i18n.getMessage("permission_drive_cannot_revoke"),
          };
        }
        return {
          valid: true,
        };
      },
    ],
  },
  {
    id: "https://accounts.google.com/*",
    description: chrome.i18n.getMessage("permission_drive"),
    revocable: true,
    validation: [
      async () => {
        await UserSettings.updateItems();
        if (UserSettings.items.driveToken !== undefined) {
          return {
            valid: false,
            message: chrome.i18n.getMessage("permission_drive_cannot_revoke"),
          };
        }
        return {
          valid: true,
        };
      },
    ],
  },
  {
    id: "https://graph.microsoft.com/*",
    description: chrome.i18n.getMessage("permission_onedrive"),
    revocable: true,
    validation: [
      async () => {
        await UserSettings.updateItems();
        if (UserSettings.items.oneDriveToken !== undefined) {
          return {
            valid: false,
            message: chrome.i18n.getMessage(
              "permission_onedrive_cannot_revoke"
            ),
          };
        }
        return {
          valid: true,
        };
      },
    ],
  },
  {
    id: "https://login.microsoftonline.com/*",
    description: chrome.i18n.getMessage("permission_onedrive"),
    revocable: true,
    validation: [
      async () => {
        await UserSettings.updateItems();
        if (UserSettings.items.oneDriveToken !== undefined) {
          return {
            valid: false,
            message: chrome.i18n.getMessage(
              "permission_onedrive_cannot_revoke"
            ),
          };
        }
        return {
          valid: true,
        };
      },
    ],
  },
];

export class Permissions implements Module {
  async getModule() {
    return {
      state: {
        permissions: await this.getPermissions(),
      },
      mutations: {
        revokePermission: async (
          state: PermissionsState,
          permissionId: string
        ) => {
          const permissionObject = this.getPermissionById(permissionId);
          const validators = permissionObject.validation ?? [];
          const validationResults = (
            await Promise.all(
              validators.map(async (validator) => await validator())
            )
          ).filter((result) => !result.valid);

          if (validationResults.length > 0) {
            const messages = await Promise.all(
              validationResults.map(
                async (result) => "• " + (await result).message
              )
            );
            alert(messages.join("\n"));
            return;
          }

          await this.revokePermission(permissionId);
          state.permissions = await this.getPermissions();
        },
      },
      namespaced: true,
    };
  }

  private async getPermissions(): Promise<Permission[]> {
    return new Promise((resolve: (permissions: Permission[]) => void) => {
      chrome.permissions.getAll(
        (permissions: chrome.permissions.Permissions) => {
          const permissionList: Permission[] = [];

          for (const permissionId of permissions.permissions ?? []) {
            const permissionObject = this.getPermissionById(permissionId);

            permissionList.push(permissionObject);
          }

          for (const permissionId of permissions.origins ?? []) {
            const permissionObject = this.getPermissionById(permissionId);

            permissionList.push(permissionObject);
          }

          permissionList.sort((a, b) => {
            return a.revocable !== b.revocable ? (a.revocable ? 1 : -1) : 0;
          });

          return resolve(permissionList);
        }
      );
    });
  }

  private getPermissionById(permissionId: string): Permission {
    const permissionObject = permissions.find((p) => p.id === permissionId);

    if (permissionObject === undefined) {
      return new Permission({
        id: permissionId,
        description: chrome.i18n.getMessage("permission_unknown_permission"),
        revocable: true,
      });
    }

    return permissionObject;
  }

  private async revokePermission(permissionId: string): Promise<void> {
    return new Promise((resolve: () => void) => {
      chrome.permissions.getAll(
        (permissions: chrome.permissions.Permissions) => {
          for (const _permissionId of permissions.permissions ?? []) {
            if (_permissionId === permissionId) {
              return chrome.permissions.remove(
                {
                  permissions: [permissionId],
                },
                () => {
                  resolve();
                }
              );
            }
          }

          for (const _permissionId of permissions.origins ?? []) {
            if (_permissionId === permissionId) {
              return chrome.permissions.remove(
                {
                  origins: [permissionId],
                },
                () => {
                  resolve();
                }
              );
            }
          }
        }
      );

      // Timeout for remove permissions failed
      setTimeout(resolve, 100);
    });
  }
}
