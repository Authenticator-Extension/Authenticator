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

function base64ToByteArray(base64: string) {
  const binary = atob(base64);
  const byteArray: number[] = new Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    byteArray[i] = binary.charCodeAt(i);
  }
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

  const dataPart = migrationUri.split("data=")[1];
  if (!dataPart) {
    return [];
  }

  let base64Data: string;
  try {
    base64Data = decodeURIComponent(dataPart);
  } catch {
    // malformed percent-encoding in the migration URI
    return [];
  }

  let byteData: number[];
  try {
    byteData = base64ToByteArray(base64Data);
  } catch {
    // malformed base64 in the migration URI (atob throws on invalid input,
    // where CryptoJS.enc.Base64.parse used to degrade silently)
    return [];
  }
  const lines: string[] = [];
  let offset = 0;
  while (offset < byteData.length) {
    if (byteData[offset] !== 10) {
      break;
    }
    // Every length byte below is attacker-controlled; validate that each field
    // stays inside the buffer before reading, so truncated/garbage payloads
    // can't fabricate entries from out-of-bounds (undefined) bytes.
    if (offset + 4 > byteData.length) {
      break;
    }
    const lineLength = byteData[offset + 1];
    const secretStart = offset + 4;
    const secretLength = byteData[offset + 3];
    const secretEnd = secretStart + secretLength;
    if (secretEnd + 2 > byteData.length) {
      break;
    }
    const accountStart = secretEnd + 2;
    const accountLength = byteData[secretEnd + 1];
    const accountEnd = accountStart + accountLength;
    if (accountEnd + 2 > byteData.length) {
      break;
    }
    const isserStart = accountEnd + 2;
    const isserLength = byteData[accountEnd + 1];
    const isserEnd = isserStart + isserLength;
    // need bytes up to the type field (isserEnd + 5)
    if (isserEnd + 5 >= byteData.length) {
      break;
    }

    const secretBytes = subBytesArray(byteData, secretStart, secretLength);
    const secret = byteArray2Base32(secretBytes);
    const accountBytes = subBytesArray(byteData, accountStart, accountLength);
    const account = byteArray2String(accountBytes);
    const issuerBytes = subBytesArray(byteData, isserStart, isserLength);
    const issuer = byteArray2String(issuerBytes);
    // index 4 is MD5, which KeyUtilities cannot generate (it would fall back
    // to SHA1 and emit wrong codes); map it to undefined so the entry is
    // skipped below instead of imported silently.
    const algorithm = ["SHA1", "SHA1", "SHA256", "SHA512", undefined][
      byteData[isserEnd + 1]
    ];
    const digits = [6, 6, 8][byteData[isserEnd + 3]];
    const type = ["totp", "hotp", "totp"][byteData[isserEnd + 5]];

    // Skip rather than emit otpauth://undefined/...&algorithm=undefined, which
    // would silently import an entry that generates wrong codes.
    if (
      !secret ||
      algorithm === undefined ||
      digits === undefined ||
      type === undefined
    ) {
      offset += lineLength + 2;
      continue;
    }

    let line = `otpauth://${type}/${account}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}`;
    if (type === "hotp") {
      let counter = 1;
      // counter byte must sit inside this entry ([offset, offset+lineLength+2))
      // and inside the buffer; the old `<= lineLength` compared an absolute
      // index against a relative length, so it never read the counter for any
      // entry after the first and could read past the buffer on the first.
      if (
        isserEnd + 7 < offset + lineLength + 2 &&
        isserEnd + 7 < byteData.length
      ) {
        counter = byteData[isserEnd + 7];
      }
      line += `&counter=${counter}`;
    }
    lines.push(line);
    offset += lineLength + 2;
  }
  return lines;
}
