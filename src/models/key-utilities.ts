// Originally based on the JavaScript implementation as provided by Russell
// Sayers on his Tin Isles blog:
// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

// Rewrite with TypeScript by Sneezry https://github.com/Sneezry

/* tslint:disable:no-reference */
/// <reference path="../../node_modules/@types/jssha/index.d.ts" />
/// <reference path="./interface.ts" />

class KeyUtilities {
  private static dec2hex(s: number): string {
    return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
  }

  private static hex2dec(s: string): number {
    return Number(`0x${s}`);
  }

  private static hex2str(hex: string) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(this.hex2dec(hex.substr(i, 2)));
    }
    return str;
  }

  private static leftpad(str: string, len: number, pad: string): string {
    if (len + 1 >= str.length) {
      str = new Array(len + 1 - str.length).join(pad) + str;
    }
    return str;
  }

  private static base32tohex(base32: string): string {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';
    let padding = 0;

    for (let i = 0; i < base32.length; i++) {
      if (base32.charAt(i) === '=') {
        bits += '00000';
        padding++;
      } else {
        const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += this.leftpad(val.toString(2), 5, '0');
      }
    }

    for (let i = 0; i + 4 <= bits.length; i += 4) {
      const chunk = bits.substr(i, 4);
      hex = hex + Number(`0b${chunk}`).toString(16);
    }

    // if (hex.length % 2 && hex[hex.length - 1] === '0') {
    //   hex = hex.substr(0, hex.length - 1);
    // }
    switch (padding) {
      case 0:
        break;
      case 6:
        hex = hex.substr(0, hex.length - 8);
        break;
      case 4:
        hex = hex.substr(0, hex.length - 6);
        break;
      case 3:
        hex = hex.substr(0, hex.length - 4);
        break;
      case 1:
        hex = hex.substr(0, hex.length - 2);
        break;
      default:
        throw new Error('Invalid Base32 string');
    }

    return hex;
  }

  private static base26(num: number) {
    const chars = '23456789BCDFGHJKMNPQRTVWXY';
    let output = '';
    const len = 5;
    for (let i = 0; i < len; i++) {
      output += chars[num % chars.length];
      num = Math.floor(num / chars.length);
    }
    if (output.length < len) {
      output = new Array(len - output.length + 1).join(chars[0]) + output;
    }
    return output;
  }

  static generate(
      type: OTPType, secret: string, counter: number, period: number) {
    secret = secret.replace(/\s/g, '');
    let len = 6;
    let b26 = false;
    let key: string;
    switch (type) {
      case OTPType.totp:
      case OTPType.hotp:
        key = this.base32tohex(secret);
        break;
      case OTPType.hex:
      case OTPType.hhex:
        key = secret;
        break;
      case OTPType.battle:
        key = this.base32tohex(secret);
        len = 8;
        break;
      case OTPType.steam:
        key = this.base32tohex(secret);
        len = 10;
        b26 = true;
        break;
      default:
        key = this.base32tohex(secret);
    }

    if (!key) {
      throw new Error('Invalid secret key');
    }

    if (type !== OTPType.hotp && type !== OTPType.hhex) {
      let epoch = Math.round(new Date().getTime() / 1000.0);
      if (localStorage.offset) {
        epoch = epoch + Number(localStorage.offset);
      }
      counter = Math.floor(epoch / period);
    }

    const time = this.leftpad(this.dec2hex(counter), 16, '0');

    if (key.length % 2 === 1) {
      if (key.substr(-1) === '0') {
        key = key.substr(0, key.length - 1);
      } else {
        key += '0';
      }
    }

    // external library for SHA functionality
    const hmacObj = new jsSHA('SHA-1', 'HEX');
    hmacObj.setHMACKey(key, 'HEX');
    hmacObj.update(time);
    const hmac = hmacObj.getHMAC('HEX');

    let offset = 0;
    if (hmac !== 'KEY MUST BE IN BYTE INCREMENTS') {
      offset = this.hex2dec(hmac.substring(hmac.length - 1));
    }

    let otp =
        (this.hex2dec(hmac.substr(offset * 2, 8)) & this.hex2dec('7fffffff')) +
        '';

    if (b26) {
      return this.base26(Number(otp));
    }

    if (otp.length < len) {
      otp = new Array(len - otp.length + 1).join('0') + otp;
    }
    return (otp).substr(otp.length - len, len).toString();
  }
}
