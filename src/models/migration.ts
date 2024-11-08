import * as CryptoJS from "crypto-js";
import { OTPType } from "./otp";

function byteArray2Base32(bytes: number[]) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const len = bytes.length;
  let result = "";
  let high = 0,
    low = 0,
    sh = 0,
    hasDataInLow = false;
  for (let i = 0; i < len; i += 5) {
    hasDataInLow = true;
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
      hasDataInLow = false;
      high = 0xe0 & bytes[i + 4];
      result += chars.charAt((low << 3) + (high >> 5));
      result += chars.charAt(0x1f & bytes[i + 4]);
      low = 0;
      sh = 0;
    }
  }

  if (hasDataInLow) {
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

export function getOTPAuthPerLineFromOPTAuthMigration(migrationUri: string) {
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
    const type = [
      OTPType[OTPType.totp],
      OTPType[OTPType.hotp],
      OTPType[OTPType.totp],
    ][byteData[isserStart + isserLength + 5]];
    let line = `otpauth://${type}/${account}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}`;
    if (type === OTPType[OTPType.hotp]) {
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
