import {
  AlgorithmIndentifier,
  GostDigest,
  gostEngine as GostEngine,
} from "node-gost-crypto";
import { expect } from "chai";
import { KeyUtilities } from "../models/key-utilities";
import { OTPAlgorithm, OTPType, OTPUtil } from "../models/otp";

describe("Test GOST 2012", () => {
  const secret: string = getRandomHEXString(32);
  const counter: number = calculateCounter(new Date());
  testAlgorithm(secret, counter, OTPAlgorithm.GOST3411_2012_256);
  testAlgorithm(secret, counter, OTPAlgorithm.GOST3411_2012_512);
});

function calculateCounter(date: Date) {
  const epoch: number = Math.round(date.getTime() / 1000.0);
  const period: number = 30;
  return Math.floor(epoch / period);
}

function testAlgorithm(
  secret: string,
  counter: number,
  algorithm: OTPAlgorithm
) {
  const previousCounter = counter - 1;
  let alg: AlgorithmIndentifier;
  let cipher: GostDigest;
  alg = {
    mode: "HMAC",
    name: "GOST R 34.11",
    version: 2012,
    length: OTPUtil.getOTPAlgorithmSpec(algorithm).length,
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
      OTPAlgorithm[algorithm] +
      ") " +
      "hash from secret '" +
      secret +
      "' and counter '" +
      counter +
      "' = '" +
      signature +
      "', verifying",
    () => {
      expect(isSignatureOk).to.eq(true);
    }
  );
  //check previous hash algorithm
  it(
    "(" +
      OTPAlgorithm[algorithm] +
      ") " +
      "hash from secret '" +
      secret +
      "' and counter '" +
      previousCounter +
      "' = '" +
      prevSignature +
      "', verifying",
    () => {
      expect(isPrevSignatureOk).to.eq(true);
    }
  );
  //check otp is different from previous one
  it(
    "(" +
      OTPAlgorithm[algorithm] +
      ") " +
      "current otp = '" +
      otp +
      "', previous otp = '" +
      previousOtp +
      "', verifying otp codes are different",
    () => {
      expect(otp).to.not.eq(previousOtp);
    }
  );
  //check otp generated is valid
  const _secret = "B1B0AE0E5ADFBF89A5F7DF440592A3AE"; //measuring 'secret'
  const _date = new Date("2021-01-01T00:00:00.000Z"); //measuring 'date'
  const _counter = calculateCounter(_date);
  const _otp = KeyUtilities.generate(
    OTPType.hotp,
    _secret,
    _counter,
    30,
    6,
    algorithm
  );
  let _validOtp = "";
  if (algorithm === OTPAlgorithm.GOST3411_2012_256) {
    _validOtp = "982313"; //measuring 'otp'
  }
  if (algorithm === OTPAlgorithm.GOST3411_2012_512) {
    _validOtp = "733980"; //measuring 'otp'
  }
  it(
    "(" +
      OTPAlgorithm[algorithm] +
      ") " +
      "valid otp for secret '" +
      _secret +
      "' and date '" +
      _date +
      "' is '" +
      _validOtp +
      "', verifying",
    () => {
      expect(_otp).to.eq(_validOtp);
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
