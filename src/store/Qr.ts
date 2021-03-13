export class Qr implements Module {
  getModule() {
    return {
      state: {
        qr: "",
      },
      mutations: {
        setQr(state: { qr: string }, url: string) {
          state.qr = `url(${url})`;
        },
      },
      namespaced: true,
    };
  }
}
