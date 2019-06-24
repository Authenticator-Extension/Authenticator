export class Style implements IModule {
  getModule() {
    return {
      state: {
        style: {
          timeout: false,
          edit: false,
          slidein: false,
          slideout: false,
          fadein: false,
          fadeout: false,
          qrfadein: false,
          qrfadeout: false,
          notificationFadein: false,
          notificationFadeout: false,
          hotpDiabled: false,
        },
      },
      mutations: {
        showMenu(state: StyleState) {
          state.style.slidein = true;
          state.style.slideout = false;
        },
        hideMenu(state: StyleState) {
          state.style.slidein = false;
          state.style.slideout = true;
          setTimeout(() => {
            state.style.slideout = false;
          }, 200);
        },
        showInfo(state: StyleState) {
          state.style.fadein = true;
          state.style.fadeout = false;
        },
        hideInfo(state: StyleState) {
          state.style.fadein = false;
          state.style.fadeout = true;
          setTimeout(() => {
            state.style.fadeout = false;
          }, 200);
        },
      },
      namespaced: true,
    };
  }
}
