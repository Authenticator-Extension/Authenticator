export class CurrentView implements Module {
  getModule() {
    return {
      state: {
        info: "",
      },
      mutations: {
        changeView(state: { info: string }, viewName: string) {
          state.info = viewName;
        },
      },
      namespaced: true,
    };
  }
}
