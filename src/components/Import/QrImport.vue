<template>
  <div>
    <p style="margin: 10px 20px 20px 20px">
      {{ i18n.import_backup_qr_in_batches }}
    </p>
    <a-file-input
      button-type="file"
      accept="image/*"
      @change="importQr($event, true)"
      multiple="true"
      :label="i18n.import_backup_qr"
    />
  </div>
</template>
<script lang="ts">
import Vue from "vue";
// @ts-ignore
import QRCode from "qrcode-reader";
import jsQR from "jsqr";
import { getEntryDataFromOTPAuthPerLine } from "../../import";
import { EntryStorage } from "../../models/storage";
import { Encryption } from "../../models/encryption";

export default Vue.extend({
  methods: {
    async importQr(event: Event, closeWindow: Boolean) {
      const target = event.target as HTMLInputElement;
      if (!target || !target.files) {
        return;
      }
      if (target.files.length) {
        const otpUrlList: string[] = [];
        let hasFailedResults = false;
        for (let fileIndex = 0; fileIndex < target.files.length; fileIndex++) {
          const file = target.files[fileIndex];
          const otpUrl = await getOtpUrlFromQrFile(file);
          if (otpUrl !== null) {
            otpUrlList.push(otpUrl);
          } else {
            hasFailedResults = true;
          }
        }

        const result = await getEntryDataFromOTPAuthPerLine(
          otpUrlList.join("\n")
        );

        let importData: {
          // @ts-ignore
          key?: { enc: string; hash: string };
          [hash: string]: RawOTPStorage;
        } = result.exportData;

        const { failedCount, succeededCount } = result;

        let decryptedFileData: { [hash: string]: RawOTPStorage } = importData;

        if (Object.keys(decryptedFileData).length) {
          await EntryStorage.import(
            this.$encryption as Encryption,
            decryptedFileData
          );

          if (hasFailedResults) {
            alert(this.i18n.import_backup_qr_partly_failed);
          } else if (failedCount && succeededCount) {
            alert(this.i18n.migration_partly_fail);
          } else if (succeededCount) {
            alert(this.i18n.updateSuccess);
          } else {
            alert(this.i18n.migration_fail);
          }

          if (closeWindow) {
            window.close();
          }
        } else {
          alert(this.i18n.errorqr);
          if (closeWindow) {
            window.close();
          }
        }
      } else {
        alert(this.i18n.updateFailure);
        if (closeWindow) {
          window.alert(this.i18n.updateFailure);
          window.close();
        }
      }
      return;
    },
  },
});

function isOtpAuthUrl(text: string): boolean {
  return (
    text.indexOf("otpauth://") === 0 ||
    text.indexOf("otpauth-migration://") === 0
  );
}

async function getOtpUrlFromQrFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;

      const image: HTMLImageElement = document.createElement("img");
      image.onload = () => {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const ctx: CanvasRenderingContext2D = canvas.getContext(
          "2d"
        ) as CanvasRenderingContext2D;

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const qrImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // jsQR decodes byte-mode QR data as UTF-8, unlike qrcode-reader below
        // which decodes it as Latin-1 and garbles non-ASCII text (e.g. Chinese).
        const jsQrCode = jsQR(qrImageData.data, canvas.width, canvas.height);

        if (jsQrCode && jsQrCode.data && isOtpAuthUrl(jsQrCode.data)) {
          return resolve(jsQrCode.data);
        }

        // fallback: qrcode-reader can decode some images jsQR fails on,
        // but mangles non-ASCII text - only used when jsQR finds nothing.
        const qrReader = new QRCode();
        qrReader.callback = (error: string, text: { result: string }) => {
          if (error || !isOtpAuthUrl(text.result)) {
            return resolve(null);
          }
          return resolve(text.result);
        };
        qrReader.decode(imageUrl);
      };
      image.src = imageUrl;
    };
    reader.readAsDataURL(file);
  });
}
</script>
