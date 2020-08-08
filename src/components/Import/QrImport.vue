<template>
  <div>
    <p style="margin: 10px 20px 20px 20px;">
      {{ i18n.import_backup_qr_in_batches }}
    </p>
    <div class="import_file">
      <label for="import_qr">{{ i18n.import_backup_qr }}</label>
      <input
        id="import_qr"
        type="file"
        v-on:change="importQr($event, true)"
        accept="image/*"
        multiple
      />
    </div>
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

        let importData: {
          // @ts-ignore
          key?: { enc: string; hash: string };
          [hash: string]: OTPStorage;
        } = await getEntryDataFromOTPAuthPerLine(otpUrlList.join("\n"));

        let decryptedFileData: { [hash: string]: OTPStorage } = importData;

        if (Object.keys(decryptedFileData).length) {
          await EntryStorage.import(
            this.$encryption as Encryption,
            decryptedFileData
          );

          if (hasFailedResults) {
            alert(this.i18n.import_backup_qr_partly_failed);
          } else {
            alert(this.i18n.updateSuccess);
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
    }
  }
});

async function getOtpUrlFromQrFile(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      const qrReader = new QRCode();
      qrReader.callback = (
        error: string,
        text: {
          result: string;
          points: Array<{
            x: number;
            y: number;
            count: number;
            estimatedModuleSize: number;
          }>;
        }
      ) => {
        if (error) {
          console.error(error);

          const image: HTMLImageElement = document.createElement("img");
          image.onload = () => {
            const canvas: HTMLCanvasElement = document.createElement("canvas");
            const ctx: CanvasRenderingContext2D = canvas.getContext(
              "2d"
            ) as CanvasRenderingContext2D;

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            const qrImageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const jsQrCode = jsQR(
              qrImageData.data,
              canvas.width,
              canvas.height
            );

            if (jsQrCode && jsQrCode.data) {
              if (jsQrCode.data.indexOf("otpauth://") !== 0) {
                return resolve(null);
              }
              return resolve(jsQrCode.data);
            } else {
              return resolve(null);
            }
          };
          image.src = imageUrl;
        } else {
          if (text.result.indexOf("otpauth://") !== 0) {
            return resolve(null);
          }
          return resolve(text.result);
        }
      };
      qrReader.decode(imageUrl);
    };
    reader.readAsDataURL(file);
  });
}
</script>
