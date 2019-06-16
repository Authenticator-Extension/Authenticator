export class Qr implements IModule {
  getModule() {
    return {
      state: {
        qr: '',
      },
      namespaced: true,
    };
  }
}
