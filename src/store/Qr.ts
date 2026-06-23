interface QrData {
  src: string;
  issuer: string;
  account: string;
  monogram: string;
  monoBg: string;
  monoFg: string;
}

export class Qr implements Module {
  getModule() {
    return {
      state: {
        qr: null as QrData | null,
      },
      mutations: {
        setQr(state: { qr: QrData | null }, data: QrData) {
          state.qr = data;
        },
      },
      namespaced: true,
    };
  }
}
