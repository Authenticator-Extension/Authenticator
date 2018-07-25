/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />
/// <reference path="./ui.ts" />

/* tslint:disable-next-line:no-any */
declare var QRCode: any;

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
        /* tslint:disable-next-line:no-unused-expression */
        new QRCode(
            'qr', {
              text: otpauth,
              width: 128,
              height: 128,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.L
            },
            resolve);
        return;
      });
}

async function qr(_ui: UI) {
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
        _ui.instance.class.qrfadein = true;
        _ui.instance.class.qrfadeout = false;
        return;
      },
      hideQr: () => {
        _ui.instance.class.qrfadein = false;
        _ui.instance.class.qrfadeout = true;
        setTimeout(() => {
          _ui.instance.class.qrfadeout = false;
        }, 200);
        return;
      }
    }
  };

  _ui.update(ui);
}
