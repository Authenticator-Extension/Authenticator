import Vue from "vue";
import ImportView from "./components/Import.vue";
import CommonComponents from "./components/common/index";
import { loadI18nMessages } from "./store/i18n";

import { Encryption } from "./models/encryption";
import { EntryStorage } from "./models/storage";
import * as CryptoJS from "crypto-js";
import * as uuid from "uuid/v4";

async function init() {
  // i18n
  Vue.prototype.i18n = await loadI18nMessages();

  // Load common components globally
  for (const component of CommonComponents) {
    Vue.component(component.name, component.component);
  }

  // Load entries to global
  const encryption = new Encryption(await getCachedPassphrase());
  const entries = await EntryStorage.get();

  if (encryption.getEncryptionStatus()) {
    for (const entry of entries) {
      await entry.applyEncryption(encryption);
    }
  }

  Vue.prototype.$entries = entries;
  Vue.prototype.$encryption = encryption;

  const instance = new Vue({
    render: h => h(ImportView)
  }).$mount("#import");

  // Set title
  try {
    document.title = instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }
}

init();

function getCachedPassphrase() {
  return new Promise((resolve: (value: string) => void) => {
    chrome.runtime.sendMessage(
      { action: "passphrase" },
      (passphrase: string) => {
        return resolve(passphrase);
      }
    );
  });
}

export function decryptBackupData(
  backupData: { [hash: string]: OTPStorage },
  passphrase: string | null
) {
  const decryptedbackupData: { [hash: string]: OTPStorage } = {};
  for (const hash of Object.keys(backupData)) {
    if (typeof backupData[hash] !== "object") {
      continue;
    }
    if (!backupData[hash].secret) {
      continue;
    }
    if (backupData[hash].encrypted && !passphrase) {
      continue;
    }
    if (backupData[hash].encrypted && passphrase) {
      try {
        backupData[hash].secret = CryptoJS.AES.decrypt(
          backupData[hash].secret,
          passphrase
        ).toString(CryptoJS.enc.Utf8);
        backupData[hash].encrypted = false;
      } catch (error) {
        continue;
      }
    }
    // backupData[hash].secret may be empty after decrypt with wrong
    // passphrase
    if (!backupData[hash].secret) {
      continue;
    }
    decryptedbackupData[hash] = backupData[hash];
  }
  return decryptedbackupData;
}

function byteArray2Base32(bytes: number[]) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const len = bytes.length;
  let result = "";
  let high = 0,
    low = 0,
    sh = 0;
  for (let i = 0; i < len; i += 5) {
    high = 0xf8 & bytes[i];
    result += chars.charAt(high >> 3);
    low = 0x07 & bytes[i];
    sh = 2;

    if (i + 1 < len) {
      high = 0xc0 & bytes[i + 1];
      result += chars.charAt((low << 2) + (high >> 6));
      result += chars.charAt((0x3e & bytes[i + 1]) >> 1);
      low = bytes[i + 1] & 0x01;
      sh = 4;
    }

    if (i + 2 < len) {
      high = 0xf0 & bytes[i + 2];
      result += chars.charAt((low << 4) + (high >> 4));
      low = 0x0f & bytes[i + 2];
      sh = 1;
    }

    if (i + 3 < len) {
      high = 0x80 & bytes[i + 3];
      result += chars.charAt((low << 1) + (high >> 7));
      result += chars.charAt((0x7c & bytes[i + 3]) >> 2);
      low = 0x03 & bytes[i + 3];
      sh = 3;
    }

    if (i + 4 < len) {
      high = 0xe0 & bytes[i + 4];
      result += chars.charAt((low << 3) + (high >> 5));
      result += chars.charAt(0x1f & bytes[i + 4]);
      low = 0;
      sh = 0;
    }
  }

  if (low != 0) {
    result += chars.charAt(low << sh);
  }

  const padlen = 8 - (result.length % 8);
  return result + (padlen < 8 ? Array(padlen + 1).join("=") : "");
}

function wordArrayToByteArray(wordArray: CryptoJS.lib.WordArray) {
  const byteArray: number[] = [];
  for (let i = 0; i < wordArray.words.length; ++i) {
    const word = wordArray.words[i];
    for (let j = 3; j >= 0; --j) {
      byteArray.push((word >> (8 * j)) & 0xff);
    }
  }
  byteArray.length = wordArray.sigBytes;
  return byteArray;
}

function byteArray2String(bytes: number[]) {
  return String.fromCharCode.apply(null, bytes);
}

function subBytesArray(bytes: number[], start: number, length: number) {
  const subBytes: number[] = [];
  for (let i = 0; i < length; i++) {
    subBytes.push(bytes[start + i]);
  }
  return subBytes;
}

function getOTPAuthPerLineFromOPTAuthMigration(migrationUri: string) {
  if (!migrationUri.startsWith("otpauth-migration:")) {
    return [];
  }

  const base64Data = decodeURIComponent(migrationUri.split("data=")[1]);
  const wordArrayData = CryptoJS.enc.Base64.parse(base64Data);
  const byteData = wordArrayToByteArray(wordArrayData);
  const lines: string[] = [];
  let offset = 0;
  while (offset < byteData.length) {
    if (byteData[offset] !== 10) {
      break;
    }
    const lineLength = byteData[offset + 1];
    const secretStart = offset + 4;
    const secretLength = byteData[offset + 3];
    const secretBytes = subBytesArray(byteData, secretStart, secretLength);
    const secret = byteArray2Base32(secretBytes);
    const accountStart = secretStart + secretLength + 2;
    const accountLength = byteData[secretStart + secretLength + 1];
    const accountBytes = subBytesArray(byteData, accountStart, accountLength);
    const account = byteArray2String(accountBytes);
    const isserStart = accountStart + accountLength + 2;
    const isserLength = byteData[accountStart + accountLength + 1];
    const issuerBytes = subBytesArray(byteData, isserStart, isserLength);
    const issuer = byteArray2String(issuerBytes);
    const algorithm = ["SHA1", "SHA1", "SHA256", "SHA512", "MD5"][
      byteData[isserStart + isserLength + 1]
    ];
    const digits = [6, 6, 8][byteData[isserStart + isserLength + 3]];
    const type = ["totp", "hotp", "totp"][
      byteData[isserStart + isserLength + 5]
    ];
    let line = `otpauth://${type}/${account}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}`;
    if (type === "hotp") {
      let counter = 1;
      if (isserStart + isserLength + 7 <= lineLength) {
        counter = byteData[isserStart + isserLength + 7];
      }
      line += `&counter=${counter}`;
    }
    lines.push(line);
    offset += lineLength + 2;
  }
  return lines;
}

export async function getEntryDataFromOTPAuthPerLine(importCode: string) {
  const lines = importCode.split("\n");
  const exportData: { [hash: string]: OTPStorage } = {};
  for (let item of lines) {
    item = item.trim();
    if (item.startsWith("otpauth-migration:")) {
      const migrationData = getOTPAuthPerLineFromOPTAuthMigration(item);
      for (const line of migrationData) {
        lines.push(line);
      }
      continue;
    }
    if (!item.startsWith("otpauth:")) {
      continue;
    }

    let uri = item.split("otpauth://")[1];
    let type = uri.substr(0, 4).toLowerCase();
    uri = uri.substr(5);
    let label = uri.split("?")[0];
    const parameterPart = uri.split("?")[1];
    if (!parameterPart) {
      continue;
    } else {
      let secret = "";
      let account: string | undefined;
      let issuer: string | undefined;
      let algorithm: string | undefined;
      let period: number | undefined;
      let digits: number | undefined;

      try {
        label = decodeURIComponent(label);
      } catch (error) {
        console.error(error);
      }
      if (label.indexOf(":") !== -1) {
        issuer = label.split(":")[0];
        account = label.split(":")[1];
      } else {
        account = label;
      }
      const parameters = parameterPart.split("&");
      parameters.forEach(item => {
        const parameter = item.split("=");
        if (parameter[0].toLowerCase() === "secret") {
          secret = parameter[1];
        } else if (parameter[0].toLowerCase() === "issuer") {
          try {
            issuer = decodeURIComponent(parameter[1]);
          } catch {
            issuer = parameter[1];
          }
          issuer = issuer.replace(/\+/g, " ");
        } /* else if (parameter[0].toLowerCase() === "counter") {
          let counter = Number(parameter[1]);
          counter = isNaN(counter) || counter < 0 ? 0 : counter;
        } */ else if (
          parameter[0].toLowerCase() === "period"
        ) {
          period = Number(parameter[1]);
          period =
            isNaN(period) || period < 0 || period > 60 || 60 % period !== 0
              ? undefined
              : period;
        } else if (parameter[0].toLowerCase() === "digits") {
          digits = Number(parameter[1]);
          digits = isNaN(digits) ? 6 : digits;
        } else if (parameter[0].toLowerCase() === "algorithm") {
          algorithm = parameter[1];
        }
      });

      if (!secret) {
        continue;
      } else if (
        !/^[0-9a-f]+$/i.test(secret) &&
        !/^[2-7a-z]+=*$/i.test(secret)
      ) {
        continue;
      } else {
        const hash = await uuid();
        if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "totp"
        ) {
          type = "hex";
        } else if (
          !/^[2-7a-z]+=*$/i.test(secret) &&
          /^[0-9a-f]+$/i.test(secret) &&
          type === "hotp"
        ) {
          type = "hhex";
        }

        exportData[hash] = {
          account,
          hash,
          issuer,
          secret,
          type,
          encrypted: false,
          index: 0,
          counter: 0,
          pinned: false
        };
        if (period) {
          exportData[hash].period = period;
        }
        if (digits) {
          exportData[hash].digits = digits;
        }
        if (algorithm) {
          exportData[hash].algorithm = algorithm;
        }
      }
    }
  }
  return exportData;
}
