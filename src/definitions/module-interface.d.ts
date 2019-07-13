interface IModule {
  getModule(): Promise<VuexConstructor> | VuexConstructor;
}

interface VuexConstructor {
  state?: {
    [key: string]: Object | Function;
  };
  mutations?: {
    [key: string]: Function;
  };
  actions?: {
    [key: string]:
      | Function
      | {
          root: Boolean;
          handler: Function;
        };
  };
  getters?: {
    [key: string]: Function;
  };
  modules?: Object;
  plugins?: Array<Function>;
  strict?: Boolean;
  devtools?: Boolean;
}

interface MenuState {
  version: String;
  zoom: Number;
  autolock: Number;
  useAutofill: Boolean;
  useHighContrast: Boolean;
  backupDisabled: Boolean;
  storageArea: String;
}

interface StyleState {
  style: {
    timeout: Boolean;
    isEditing: Boolean;
    slidein: Boolean;
    slideout: Boolean;
    fadein: Boolean;
    fadeout: Boolean;
    qrfadein: Boolean;
    qrfadeout: Boolean;
    notificationFadein: Boolean;
    notificationFadeout: Boolean;
    hotpDisabled: Boolean;
  };
}

interface AccountsState {
  entries: IOTPEntry[];
  encryption: IEncryption;
  OTPType: Number;
  shouldShowPassphrase: Boolean;
  sectorStart: Boolean;
  sectorOffset: Number;
  second: Number;
  notification: String;
  filter: Boolean;
  siteName: (string | null)[];
  showSearch: Boolean;
  exportData: { [k: string]: IOTPEntry };
  exportEncData: { [k: string]: IOTPEntry };
}

interface NotificationState {
  message: Array<string>;
  confirmMessage: String;
  messageIdle: Boolean;
  notification: String;
}

interface BackupState {
  dropboxEncrypted: Boolean;
  driveEncrypted: Boolean;
  dropboxToken: Boolean;
  driveToken: Boolean;
}
