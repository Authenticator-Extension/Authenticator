import { GostEngine, GostDigest, AlgorithmIndentifier } from "crypto-gost";

import { expect } from "chai";

describe("Test Gost Hash", () => {
  const secret: string = getRandomHEXString(32);
  const epoch: number = Math.round(Date.now() / 1000.0);
  const period: number = 30;
  const counter: number = Math.floor(epoch / period);
  testGostHash(secret, counter, 256);
  testGostHash(secret, counter, 512);
});

function testGostHash(secret: string, counter: number, length: number) {
  const previousCounter = counter - 1;
  let alg: AlgorithmIndentifier;
  let cipher: GostDigest;
  alg = {
    mode: "HMAC",
    name: "GOST R 34.11",
    version: 2012,
    length: length,
  };
  cipher = GostEngine.getGostDigest(alg);
  //current counter
  const signatureArray = new Uint8Array(
    cipher.sign(
      new Uint8Array(parseHexString(secret)),
      new Uint8Array(counterToArray(counter))
    )
  );
  const signature = toHexString(signatureArray);
  const isSignatureOk = cipher.verify(
    new Uint8Array(parseHexString(secret)),
    signatureArray,
    new Uint8Array(counterToArray(counter))
  );
  const otp = getOtp(signature);
  //previous counter
  const prevSignatureArray = new Uint8Array(
    cipher.sign(
      new Uint8Array(parseHexString(secret)),
      new Uint8Array(counterToArray(previousCounter))
    )
  );
  const prevSignature = toHexString(prevSignatureArray);
  const isPrevSignatureOk = cipher.verify(
    new Uint8Array(parseHexString(secret)),
    prevSignatureArray,
    new Uint8Array(counterToArray(previousCounter))
  );
  const previousOtp = getOtp(prevSignature);
  //check hash algorithm
  it(
    "(" +
      length +
      ") " +
      "hash from secret '" +
      secret +
      "' and counter '" +
      counter +
      "' = '" +
      signature +
      "', verifying hash",
    () => {
      expect(isSignatureOk).to.eq(true);
    }
  );
  //check previous hash algorithm
  it(
    "(" +
      length +
      ") " +
      "hash from secret '" +
      secret +
      "' and counter '" +
      previousCounter +
      "' = '" +
      prevSignature +
      "', verifying hash",
    () => {
      expect(isPrevSignatureOk).to.eq(true);
    }
  );
  //check otp is different from previous one
  it(
    "current otp = '" +
      otp +
      "', previous otp = '" +
      previousOtp +
      "', verifying otp codes are different",
    () => {
      expect(otp).to.not.eq(previousOtp);
    }
  );
}

function getOtp(signature: string) {
  const digits: number = 6;
  const offset = hex2dec(signature.substring(signature.length - 1));
  let otp =
    (hex2dec(signature.substr(offset * 2, 8)) & hex2dec("7fffffff")) + "";
  otp = otp.substr(otp.length - digits, digits);
  return otp;
}

function counterToArray(counter: number) {
  const data = [];
  let value = counter;
  for (let i = 8; i-- > 0; value >>>= 8) {
    data[i] = value & 0xff;
  }
  return data;
}

function getRandomHEXString(length: number) {
  const randomChars = "ABCDEF0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }
  return result;
}

function hex2dec(s: string) {
  return Number(`0x${s}`);
}

function parseHexString(str: string) {
  let result = [];
  while (str.length >= 8) {
    result.push(parseInt(str.substring(0, 8), 16));
    str = str.substring(8, str.length);
  }
  return result;
}

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}
