import { defineStore } from "pinia";
import { ref } from "vue";

interface QrData {
  src: string;
  issuer: string;
  account: string;
  monogram: string;
  monoBg: string;
  monoFg: string;
}

export const useQrStore = defineStore("qr", () => {
  const qr = ref<QrData | null>(null);

  function setQr(data: QrData) {
    qr.value = data;
  }

  return { qr, setQr };
});
