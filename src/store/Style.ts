import { ActionContext } from "vuex";

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
        // generic synchronous flag setter so the animation actions below can
        // schedule their deferred resets through a mutation (Vuex strict mode
        // forbids the setTimeout callbacks mutating state directly)
        setStyleFlag(
          state: StyleState,
          payload: { key: keyof StyleState["style"]; value: boolean }
        ) {
          state.style[payload.key] = payload.value;
        },
        showMenu(state: StyleState) {
          state.style.slidein = true;
          state.style.slideout = false;
        },
        showInfo(state: StyleState, noAnimate?: boolean) {
          if (noAnimate) {
            state.style.show = true;
          } else {
            state.style.fadein = true;
            state.style.fadeout = false;
          }
        },
        showQr(state: StyleState) {
          state.style.qrfadein = true;
          state.style.qrfadeout = false;
        },
        toggleEdit(state: StyleState) {
          state.style.isEditing = !state.style.isEditing;
        },
        toggleHotpDisabled(state: StyleState) {
          state.style.hotpDisabled = !state.style.hotpDisabled;
        },
      },
      actions: {
        // these end an animation by resetting a flag after a delay, which has
        // to be committed (not mutated directly) under strict mode
        hideMenu({ commit }: ActionContext<StyleState, object>) {
          commit("setStyleFlag", { key: "slidein", value: false });
          commit("setStyleFlag", { key: "slideout", value: true });
          setTimeout(() => {
            commit("setStyleFlag", { key: "slideout", value: false });
          }, 200);
        },
        hideInfo(
          { commit }: ActionContext<StyleState, object>,
          noAnimate?: boolean
        ) {
          if (noAnimate) {
            commit("setStyleFlag", { key: "show", value: false });
          } else {
            commit("setStyleFlag", { key: "fadein", value: false });
            commit("setStyleFlag", { key: "fadeout", value: true });
          }
          setTimeout(() => {
            commit("setStyleFlag", { key: "fadeout", value: false });
          }, 200);
        },
        hideQr({ commit }: ActionContext<StyleState, object>) {
          commit("setStyleFlag", { key: "qrfadein", value: false });
          commit("setStyleFlag", { key: "qrfadeout", value: true });
          setTimeout(() => {
            commit("setStyleFlag", { key: "qrfadeout", value: false });
          }, 200);
        },
        showNotification({ commit }: ActionContext<StyleState, object>) {
          commit("setStyleFlag", { key: "notificationFadein", value: true });
          commit("setStyleFlag", { key: "notificationFadeout", value: false });
          setTimeout(() => {
            commit("setStyleFlag", { key: "notificationFadein", value: false });
            commit("setStyleFlag", { key: "notificationFadeout", value: true });
            setTimeout(() => {
              commit("setStyleFlag", {
                key: "notificationFadeout",
                value: false,
              });
            }, 200);
          }, 1000);
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
