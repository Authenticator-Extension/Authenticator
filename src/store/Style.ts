import { defineStore } from "pinia";
import { computed, reactive } from "vue";

export const useStyleStore = defineStore("style", () => {
  const style = reactive<StyleState["style"]>({
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
  });

  // generic synchronous flag setter so the animation actions below can
  // schedule their deferred resets
  function setStyleFlag(payload: {
    key: keyof StyleState["style"];
    value: boolean;
  }) {
    style[payload.key] = payload.value;
  }

  function showMenu() {
    style.slidein = true;
    style.slideout = false;
  }

  function showInfo(noAnimate?: boolean) {
    if (noAnimate) {
      style.show = true;
    } else {
      style.fadein = true;
      style.fadeout = false;
    }
  }

  function showQr() {
    style.qrfadein = true;
    style.qrfadeout = false;
  }

  function toggleEdit() {
    style.isEditing = !style.isEditing;
  }

  function toggleHotpDisabled() {
    style.hotpDisabled = !style.hotpDisabled;
  }

  // these end an animation by resetting a flag after a delay
  function hideMenu() {
    setStyleFlag({ key: "slidein", value: false });
    setStyleFlag({ key: "slideout", value: true });
    setTimeout(() => {
      setStyleFlag({ key: "slideout", value: false });
    }, 200);
  }

  function hideInfo(noAnimate?: boolean) {
    if (noAnimate) {
      setStyleFlag({ key: "show", value: false });
    } else {
      setStyleFlag({ key: "fadein", value: false });
      setStyleFlag({ key: "fadeout", value: true });
    }
    setTimeout(() => {
      setStyleFlag({ key: "fadeout", value: false });
    }, 200);
  }

  function hideQr() {
    setStyleFlag({ key: "qrfadein", value: false });
    setStyleFlag({ key: "qrfadeout", value: true });
    setTimeout(() => {
      setStyleFlag({ key: "qrfadeout", value: false });
    }, 200);
  }

  function showNotification() {
    setStyleFlag({ key: "notificationFadein", value: true });
    setStyleFlag({ key: "notificationFadeout", value: false });
    setTimeout(() => {
      setStyleFlag({ key: "notificationFadein", value: false });
      setStyleFlag({ key: "notificationFadeout", value: true });
      setTimeout(() => {
        setStyleFlag({ key: "notificationFadeout", value: false });
      }, 200);
    }, 1000);
  }

  // Returns true if menu or info screen shown
  const isMenuShown = computed(
    () => style.fadein || style.show || style.slidein,
  );

  return {
    style,
    setStyleFlag,
    showMenu,
    showInfo,
    showQr,
    toggleEdit,
    toggleHotpDisabled,
    hideMenu,
    hideInfo,
    hideQr,
    showNotification,
    isMenuShown,
  };
});
