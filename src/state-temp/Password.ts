export class Password implements IModule {
  getModule() {
    return {
      state: {
        passphrase: '',
      },
      namespaced: true
    };
  }
}
