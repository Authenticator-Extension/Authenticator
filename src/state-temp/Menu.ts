import { ManagedStorage } from '../models/storage';

export class Menu implements IModule {
  async getModule() {
    const menuState = {
      state: {
        version: chrome.runtime.getManifest().version,
        zoom: Number(localStorage.zoom) || 100,
        useAutofill: localStorage.autofill === 'true',
        useHighContrast: localStorage.highContrast === 'true',
        newStorageLocation: localStorage.storageLocation,
        backupDisabled: await ManagedStorage.get('disableBackup'),
        storageArea: await ManagedStorage.get('storageArea'), // TODO
        feedbackURL: await ManagedStorage.get('feedbackURL'),
      },
      namespaced: true,
    };

    this.resize(menuState.state.zoom);

    return menuState;
  }

  private resize(zoom: number) {
    if (zoom !== 100) {
      document.body.style.marginBottom = 480 * (zoom / 100 - 1) + 'px';
      document.body.style.marginRight = 320 * (zoom / 100 - 1) + 'px';
      document.body.style.transform = 'scale(' + zoom / 100 + ')';
    }
  }
}
