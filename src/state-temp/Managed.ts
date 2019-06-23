import { ManagedStorage } from '../models/storage';

export class Managed implements IModule {
  async getModule() {
    return {
      state: {
        disableInstallHelp: await ManagedStorage.get('disableInstallHelp'),
        disableBackup: await ManagedStorage.get('disableBackup'),
        storageArea: await ManagedStorage.get('storageArea'),
        feedbackURL: await ManagedStorage.get('feedbackURL'),
      },
      namespaced: true,
    };
  }
}
