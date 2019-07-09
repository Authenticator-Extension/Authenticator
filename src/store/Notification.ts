import { ActionContext } from "vuex";

export class Notification implements IModule {
  getModule() {
    return {
      state: {
        message: [], // Message content for alert with ok button
        confirmMessage: "", // Message content for alert with yes / no
        messageIdle: true, // Should show alert box?
        notification: "" // Ephermal message text
      },
      mutations: {
        alert: (state: NotificationState, message: string) => {
          state.message.unshift(message);
        },
        closeAlert: (state: NotificationState) => {
          state.messageIdle = false;
          state.message.shift();
          setTimeout(() => {
            state.messageIdle = true;
          }, 200);
        },
        setConfirm: (state: NotificationState, message: string) => {
          state.confirmMessage = message;
        },
        setNotification: (state: NotificationState, message: string) => {
          state.notification = message;
        }
      },
      actions: {
        confirm: async (
          state: ActionContext<NotificationState, {}>,
          message: string
        ) => {
          return new Promise((resolve: (value: boolean) => void) => {
            state.commit("setConfirm", message);
            window.addEventListener("confirm", event => {
              state.commit("setConfirm", "");
              if (!this.isCustomEvent(event)) {
                resolve(false);
                return;
              }
              resolve(event.detail);
              return;
            });
          });
        },
        ephermalMessage: (
          state: ActionContext<NotificationState, {}>,
          message: string
        ) => {
          state.commit("setNotification", message);
          state.commit("style/showNotification", null, { root: true });
        }
      },
      namespaced: true
    };
  }

  private isCustomEvent(event: Event): event is CustomEvent {
    return "detail" in event;
  }
}
