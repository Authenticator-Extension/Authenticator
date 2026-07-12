import { ActionContext } from "vuex";

export class Notification implements Module {
  getModule() {
    return {
      state: {
        message: [], // Message content for alert with ok button
        confirmMessage: "", // Message content for alert with yes / no
        messageIdle: true, // Should show alert box?
        notification: "", // Ephermal message text
      },
      mutations: {
        alert: (state: NotificationState, message: string) => {
          state.message.unshift(message);
        },
        setMessageIdle: (state: NotificationState, value: boolean) => {
          state.messageIdle = value;
        },
        shiftMessage: (state: NotificationState) => {
          state.message.shift();
        },
        setConfirm: (state: NotificationState, message: string) => {
          state.confirmMessage = message;
        },
        setNotification: (state: NotificationState, message: string) => {
          state.notification = message;
        },
      },
      actions: {
        // was a mutation, but the deferred reset (setTimeout) mutated state
        // outside the handler, which Vuex strict mode forbids
        closeAlert: ({ commit }: ActionContext<NotificationState, object>) => {
          commit("setMessageIdle", false);
          commit("shiftMessage");
          setTimeout(() => {
            commit("setMessageIdle", true);
          }, 200);
        },
        confirm: async (
          state: ActionContext<NotificationState, object>,
          message: string,
        ) => {
          return new Promise((resolve: (value: boolean) => void) => {
            state.commit("setConfirm", message);
            // Named handler so it can be removed once it fires; the old
            // anonymous listener was added on every dispatch and never removed,
            // accumulating and re-firing on later confirms.
            const handler = (event: Event) => {
              window.removeEventListener("confirm", handler);
              state.commit("setConfirm", "");
              if (!this.isCustomEvent(event)) {
                resolve(false);
                return;
              }
              resolve(event.detail);
              return;
            };
            window.addEventListener("confirm", handler);
          });
        },
        ephermalMessage: (
          state: ActionContext<NotificationState, object>,
          message: string,
        ) => {
          state.commit("setNotification", message);
          state.dispatch("style/showNotification", null, { root: true });
        },
      },
      namespaced: true,
    };
  }

  private isCustomEvent(event: Event): event is CustomEvent {
    return "detail" in event;
  }
}
