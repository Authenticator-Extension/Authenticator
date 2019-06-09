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
