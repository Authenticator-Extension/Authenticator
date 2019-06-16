export class CurrentView implements IModule {
  getModule() {
    return {
      state: {
        info: '',
      },
      namespaced: true,
    };
  }

  // enum views?
}
