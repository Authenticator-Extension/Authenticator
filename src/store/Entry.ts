import { ManagedStorage } from "../models/storage";

export class Entry implements Module {
  async getModule() {
    const entryState = {
      state: {
        showQrDisabled: await ManagedStorage.get("disableExport")
      }
    };

    return entryState;
  }
}
