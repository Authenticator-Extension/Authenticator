import { defineStore } from "pinia";
import { ref } from "vue";
import { useStyleStore } from "./Style";

function isCustomEvent(event: Event): event is CustomEvent {
  return "detail" in event;
}

export const useNotificationStore = defineStore("notification", () => {
  const message = ref<string[]>([]); // Message content for alert with ok button
  const confirmMessage = ref(""); // Message content for alert with yes / no
  const messageIdle = ref(true); // Should show alert box?
  const notification = ref(""); // Ephermal message text

  function alert(msg: string) {
    message.value.unshift(msg);
  }

  function setMessageIdle(value: boolean) {
    messageIdle.value = value;
  }

  function shiftMessage() {
    message.value.shift();
  }

  function setConfirm(msg: string) {
    confirmMessage.value = msg;
  }

  function setNotification(msg: string) {
    notification.value = msg;
  }

  function closeAlert() {
    setMessageIdle(false);
    shiftMessage();
    setTimeout(() => {
      setMessageIdle(true);
    }, 200);
  }

  function confirm(msg: string): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void) => {
      setConfirm(msg);
      // Named handler so it can be removed once it fires; an anonymous
      // listener added on every call and never removed would accumulate and
      // re-fire on later confirms.
      const handler = (event: Event) => {
        window.removeEventListener("confirm", handler);
        setConfirm("");
        if (!isCustomEvent(event)) {
          resolve(false);
          return;
        }
        resolve(event.detail);
        return;
      };
      window.addEventListener("confirm", handler);
    });
  }

  function ephermalMessage(msg: string) {
    setNotification(msg);
    useStyleStore().showNotification();
  }

  return {
    message,
    confirmMessage,
    messageIdle,
    notification,
    alert,
    setMessageIdle,
    shiftMessage,
    setConfirm,
    setNotification,
    closeAlert,
    confirm,
    ephermalMessage,
  };
});
