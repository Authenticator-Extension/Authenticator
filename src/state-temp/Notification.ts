export class Notification implements IModule {
  getModule() {
    return {
      state: {
        message: [],
        messageIdle: true,
        confirmMessage: '',
      },
      namespaced: true,
    };
  }
}
