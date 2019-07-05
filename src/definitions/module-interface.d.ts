interface IModule {
    getModule(): Promise<VuexConstructor> | VuexConstructor;
}

interface VuexConstructor {
    state?: {
        [key: string]: Object | Function
    },
    mutations?: {
        [key: string]: Function;
    },
    actions?: {
        [key: string]: Function |
        {
            root: Boolean;
            handler: Function;
        }
    },
    getters?: {
        [key: string]: Function;
    },
    modules?: Object;
    plugins?: Array<Function>;
    strict?: Boolean;
    devtools?: Boolean;
}

interface MenuState {
    version: String;
    zoom: Number;
    useAutofill: Boolean;
    useHighContrast: Boolean;
    newStorageLocation: String;
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
        hotpDiabled: Boolean;
    }
}

interface AccountsState {
    entries: IOTPEntry[];
    encryption: IEncryption;
    OTPType: Number;
    shouldShowPassphrase: Boolean;
    exportData: String;
    exportEncData: String;
    exportFile: String;
    exportEncryptedFile: String;
    exportOneLineOtpAuthFile: String;
    getFilePassphrase: Boolean;
    sectorStart: Boolean;
    sectorOffset: Number;
    second: Number;
    notification: String;
    filter: Boolean;
    shouldFilter: Boolean;
    showSearch: Boolean;
    importType: String;
    importCode: String;
    importEncrypted: Boolean;
    importPassphrase: String;
    importFilePassphrase: String;
    unsupportedAccounts: Boolean;
    searchText: String;
    newPassphrase: { phrase: String, confirm: String };
}

interface NotificationState {
    message: Array<string>;
    confirmMessage: String;
    messageIdle: Boolean;
    notification: String;
}
