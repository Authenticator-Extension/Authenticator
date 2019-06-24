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
        [key: string]: Function;
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
        edit: Boolean;
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
