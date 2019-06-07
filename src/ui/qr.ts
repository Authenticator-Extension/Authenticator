import * as QRGen from 'qrcode-generator';
import {OTPEntry} from '../models/otp';

import {UI} from './ui';

async function getQrUrl(entry: OTPEntry) {
  return new Promise(
      (resolve: (value: string) => void, reject: (reason: Error) => void) => {
        const label =
            entry.issuer ? (entry.issuer + ':' + entry.account) : entry.account;
        const type = entry.type === OTPType.hex ?
            OTPType[OTPType.totp] :
            (entry.type === OTPType.hhex ? OTPType[OTPType.hotp] :
                                           OTPType[entry.type]);
        const otpauth = 'otpauth://' + type + '/' + label +
            '?secret=' + entry.secret +
            (entry.issuer ? ('&issuer=' + entry.issuer.split('::')[0]) : '') +
            ((entry.type === OTPType.hotp || entry.type === OTPType.hhex) ?
                 ('&counter=' + entry.counter) :
                 '') +
            (entry.type === OTPType.totp && entry.period ?
                 ('&period=' + entry.period) :
                 '');
        const qr = QRGen(0, 'L');
        qr.addData(otpauth);
        qr.make();
        resolve(qr.createDataURL(5));
        return;
      });
}

export async function qr(_ui: UI) {
  const ui: UIConfig = {
    data: {qr: ''},
    methods: {
      shouldShowQrIcon: (entry: OTPEntry) => {
        return entry.secret !== 'Encrypted' && entry.type !== OTPType.battle &&
            entry.type !== OTPType.steam;
      },
      showQr: async (entry: OTPEntry) => {
        const qrUrl = await getQrUrl(entry);
        _ui.instance.qr = `url(${qrUrl})`;
        _ui.instance.currentClass.qrfadein = true;
        _ui.instance.currentClass.qrfadeout = false;
        return;
      },
      hideQr: () => {
        _ui.instance.currentClass.qrfadein = false;
        _ui.instance.currentClass.qrfadeout = true;
        setTimeout(() => {
          _ui.instance.currentClass.qrfadeout = false;
        }, 200);
        return;
      },
    },
  };

  _ui.update(ui);
}
