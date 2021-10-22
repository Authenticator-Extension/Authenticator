import { ManagedStorage } from "../models/storage";

export class Menu implements Module {
  async getModule() {
    const menuState = {
      state: {
        version: chrome.runtime.getManifest()?.version || "0.0.0",
        zoom: Number(localStorage.zoom) || 100,
        useAutofill: localStorage.autofill === "true",
        smartFilter: localStorage.smartFilter !== "false",
        enableContextMenu: localStorage.enableContextMenu === "true",
        theme:
          localStorage.theme ||
          (localStorage.highContrast === "true" ? "accessibility" : "normal"),
        autolock: Number(localStorage.autolock) || 0,
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
          localStorage.zoom = zoom;
          this.resize(zoom);
        },
        setAutofill(state: MenuState, useAutofill: boolean) {
          state.useAutofill = useAutofill;
          localStorage.autofill = useAutofill;
        },
        setSmartFilter(state: MenuState, smartFilter: boolean) {
          state.smartFilter = smartFilter;
          localStorage.smartFilter = smartFilter;
        },
        setEnableContextMenu(state: MenuState, enableContextMenu: boolean) {
          state.enableContextMenu = enableContextMenu;
          localStorage.enableContextMenu = enableContextMenu;
        },
        setTheme(state: MenuState, theme: string) {
          state.theme = theme;
          localStorage.theme = theme;
          localStorage.removeItem("useHighContrast");
        },
        setAutolock(state: MenuState, autolock: number) {
          state.autolock = autolock;
          localStorage.autolock = autolock;
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
