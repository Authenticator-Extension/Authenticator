// TODO: rename and move stuff

export class Menu implements IModule {
  getModule() {
    // let backupDisabled: boolean | string;
    // let storageArea: boolean | string;

    // ManagedStorage.get('disableBackup').then(value => {
    //     backupDisabled = value;
    // });

    // ManagedStorage.get('storageArea').then(value => {
    //     storageArea = value;
    // });

    const version = this.getVersion();
    const zoom = Number(localStorage.zoom) || 100;
    this.resize(zoom);
    const useAutofill = localStorage.autofill === 'true';
    const useHighContrast = localStorage.highContrast === 'true';

    return {
      state: {
        version,
        zoom,
        useAutofill,
        useHighContrast,
        newStorageLocation: localStorage.storageLocation,
        backupDisabled: false, // FIX
        storageArea: 'sync', // FIX
      },
      namespaced: true,
    };
  }

  private getVersion() {
    return chrome.runtime.getManifest().version;
  }

  private resize(zoom: number) {
    if (zoom !== 100) {
      document.body.style.marginBottom = 480 * (zoom / 100 - 1) + 'px';
      document.body.style.marginRight = 320 * (zoom / 100 - 1) + 'px';
      document.body.style.transform = 'scale(' + zoom / 100 + ')';
    }
  }
}
