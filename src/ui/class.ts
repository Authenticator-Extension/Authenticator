
import {UI} from './ui';

export async function className(_ui: UI) {
  const ui: UIConfig = {
    data: {
      currentClass: {
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
  };

  _ui.update(ui);
}
