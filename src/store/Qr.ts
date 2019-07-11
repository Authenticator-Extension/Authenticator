export class Qr implements IModule {
  getModule() {
    return {
      state: {
        qr: ""
      },
      mutations: {
        setQr(state: { qr: string }, url: string) {
          state.qr = `url(${url})`;
        }
      },
      namespaced: true
    };
  }
}
