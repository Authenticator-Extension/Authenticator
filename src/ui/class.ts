/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

async function className(_ui: UI) {
  const ui: UIConfig = {
    data: {
      class: {
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
        hotpDiabled: false
      }
    }
  };

  _ui.update(ui);
}
