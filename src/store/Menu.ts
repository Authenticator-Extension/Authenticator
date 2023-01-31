import { isSafari } from "../browser";
import { ManagedStorage } from "../models/storage";

export class Menu implements Module {
  async getModule() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    const menuState = {
      state: {
        version: chrome.runtime.getManifest()?.version || "0.0.0",
        zoom: Number(LocalStorage.zoom) || 100,
        useAutofill:
          LocalStorage.autofill === "true" || LocalStorage.autofill === true,
        smartFilter:
          LocalStorage.smartFilter !== "false" &&
          LocalStorage.smartFilter !== false,
        enableContextMenu:
          LocalStorage.enableContextMenu === "true" ||
          LocalStorage.enableContextMenu === true,
        theme:
          LocalStorage.theme ||
          (LocalStorage.highContrast === "true" ||
          LocalStorage.highContrast === true
            ? "accessibility"
            : isSafari
            ? "flat"
            : "normal"),
        autolock: Number(LocalStorage.autolock) || 0,
        backupDisabled: await ManagedStorage.get("disableBackup", false),
        exportDisabled: await ManagedStorage.get("disableExport", false),
        enforcePassword: await ManagedStorage.get("enforcePassword", false),
        enforceAutolock: await ManagedStorage.get("enforceAutolock", false),
        storageArea: await ManagedStorage.get<"sync" | "local">("storageArea"),
        feedbackURL: await ManagedStorage.get<string>("feedbackURL"),
        passwordPolicy: await ManagedStorage.get<string>("passwordPolicy"),
        passwordPolicyHint: await ManagedStorage.get<string>(
          "passwordPolicyHint"
        ),
      },
      mutations: {
        setZoom: (state: MenuState, zoom: number) => {
          state.zoom = zoom;
          LocalStorage.zoom = zoom;
          chrome.storage.local.set({ LocalStorage });
          this.resize(zoom);
        },
        setAutofill(state: MenuState, useAutofill: boolean) {
          state.useAutofill = useAutofill;
          LocalStorage.autofill = useAutofill;
          chrome.storage.local.set({ LocalStorage });
        },
        setSmartFilter(state: MenuState, smartFilter: boolean) {
          state.smartFilter = smartFilter;
          LocalStorage.smartFilter = smartFilter;
          chrome.storage.local.set({ LocalStorage });
        },
        setEnableContextMenu(state: MenuState, enableContextMenu: boolean) {
          state.enableContextMenu = enableContextMenu;
          LocalStorage.enableContextMenu = enableContextMenu;
          chrome.storage.local.set({ LocalStorage });
        },
        setTheme(state: MenuState, theme: string) {
          state.theme = theme;
          LocalStorage.theme = theme;
          LocalStorage.useHighContrast = undefined;
          chrome.storage.local.set({ LocalStorage });
        },
        setAutolock(state: MenuState, autolock: number) {
          state.autolock = autolock;
          LocalStorage.autolock = autolock;
          chrome.storage.local.set({ LocalStorage });
        },
      },
      namespaced: true,
    };

    this.resize(menuState.state.zoom);

    return menuState;
  }

  private resize(zoom: number) {
    if (zoom !== 100) {
      document.body.style.marginBottom = 480 * (zoom / 100 - 1) + "px";
      document.body.style.marginRight = 320 * (zoom / 100 - 1) + "px";
      document.body.style.transform = "scale(" + zoom / 100 + ")";
    }
  }
}
