/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function info(_ui: UI) {
  const ui: UIConfig = {
    data: {info: ''},
    methods: {
      showInfo: (tab: string) => {
        _ui.instance.class.fadein = true;
        _ui.instance.class.fadeout = false;
        _ui.instance.info = tab;
        return;
      },
      closeInfo: () => {
        _ui.instance.class.fadein = false;
        _ui.instance.class.fadeout = true;
        setTimeout(() => {
          _ui.instance.class.fadeout = false;
          _ui.instance.info = '';
        }, 200);
        return;
      }
    }
  };

  _ui.update(ui);
}