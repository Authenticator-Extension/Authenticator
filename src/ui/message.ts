/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

function isCustomEvent(event: Event): event is CustomEvent {
  return 'detail' in event;
}

async function message(_ui: UI) {
  const ui: UIConfig = {
    data: {message: [], messageIdle: true, confirmMessage: ''},
    methods: {
      alert: (message: string) => {
        _ui.instance.message.unshift(message);
      },
      closeAlert: () => {
        _ui.instance.messageIdle = false;
        _ui.instance.message.shift();
        setTimeout(() => {
          _ui.instance.messageIdle = true;
        }, 200);
      },
      confirm: async (message: string) => {
        return new Promise(
            (resolve: (value: boolean) => void,
             reject: (reason: Error) => void) => {
              _ui.instance.confirmMessage = message;
              window.addEventListener('confirm', (event) => {
                _ui.instance.confirmMessage = '';
                if (!isCustomEvent(event)) {
                  return resolve(false);
                }
                return resolve(event.detail);
              });
              return;
            });
      },
      confirmOK: () => {
        const confirmEvent = new CustomEvent('confirm', {detail: true});
        window.dispatchEvent(confirmEvent);
        return;
      },
      confirmCancel: () => {
        const confirmEvent = new CustomEvent('confirm', {detail: false});
        window.dispatchEvent(confirmEvent);
        return;
      }
    }
  };

  _ui.update(ui);
}
