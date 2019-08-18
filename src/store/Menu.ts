import { ManagedStorage } from "../models/storage";

export class Menu implements IModule {
  async getModule() {
    const menuState = {
      state: {
        version: chrome.runtime.getManifest().version,
        zoom: Number(localStorage.zoom) || 100,
        useAutofill: localStorage.autofill === "true",
        useHighContrast: localStorage.highContrast === "true",
        autolock: Number(localStorage.autolock) || 0,
        backupDisabled: await ManagedStorage.get("disableBackup"),
        storageArea: await ManagedStorage.get("storageArea"),
        feedbackURL: await ManagedStorage.get("feedbackURL")
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
        setHighContrast(state: MenuState, useHighContrast: boolean) {
          state.useHighContrast = useHighContrast;
          localStorage.highContrast = useHighContrast;
        },
        setAutolock(state: MenuState, autolock: number) {
          state.autolock = autolock;
          localStorage.autolock = autolock;
        }
      },
      namespaced: true
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
