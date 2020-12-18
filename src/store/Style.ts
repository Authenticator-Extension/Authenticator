export class Style implements Module {
  getModule() {
    return {
      state: {
        style: {
          timeout: false,
          isEditing: false,
          slidein: false, // menu
          slideout: false, // menu
          fadein: false, // info
          fadeout: false, // info
          show: false, // info
          qrfadein: false,
          qrfadeout: false,
          notificationFadein: false,
          notificationFadeout: false,
          hotpDisabled: false,
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
        showInfo(state: StyleState, noAnimate?: boolean) {
          if (noAnimate) {
            state.style.show = true;
          } else {
            state.style.fadein = true;
            state.style.fadeout = false;
          }
        },
        hideInfo(state: StyleState, noAnimate?: boolean) {
          if (noAnimate) {
            state.style.show = false;
          } else {
            state.style.fadein = false;
            state.style.fadeout = true;
          }
          setTimeout(() => {
            state.style.fadeout = false;
          }, 200);
        },
        showQr(state: StyleState) {
          state.style.qrfadein = true;
          state.style.qrfadeout = false;
        },
        hideQr(state: StyleState) {
          state.style.qrfadein = false;
          state.style.qrfadeout = true;
          setTimeout(() => {
            state.style.qrfadeout = false;
          }, 200);
        },
        showNotification(state: StyleState) {
          state.style.notificationFadein = true;
          state.style.notificationFadeout = false;
          setTimeout(() => {
            state.style.notificationFadein = false;
            state.style.notificationFadeout = true;
            setTimeout(() => {
              state.style.notificationFadeout = false;
            }, 200);
          }, 1000);
        },
        toggleEdit(state: StyleState) {
          state.style.isEditing = !state.style.isEditing;
        },
        toggleHotpDisabled(state: StyleState) {
          state.style.hotpDisabled = !state.style.hotpDisabled;
        },
      },
      getters: {
        // Returns true if menu or info screen shown
        isMenuShown(state: StyleState) {
          return state.style.fadein || state.style.show || state.style.slidein;
        },
      },
      namespaced: true,
    };
  }
}
