export class CurrentView implements IModule {
  getModule() {
    return {
      state: {
        info: ""
      },
      mutations: {
        changeView(state: { info: string }, viewName: string) {
          state.info = viewName;
        }
      },
      namespaced: true
    };
  }
}
