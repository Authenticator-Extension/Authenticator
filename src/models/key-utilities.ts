// Originally based on the JavaScript implementation as provided by Russell
// Sayers on his Tin Isles blog:
// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

// Rewrite with TypeScript by Sneezry https://github.com/Sneezry
import jsSHA = require('jssha');

export class KeyUtilities {
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

    for (let i = 0; i < base32.length; i++) {
      const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
      bits += this.leftpad(val.toString(2), 5, '0');
    }

    for (let i = 0; i + 4 <= bits.length; i += 4) {
      const chunk = bits.substr(i, 4);
      hex = hex + Number(`0b${chunk}`).toString(16);
    }

    if (hex.length % 2 && hex[hex.length - 1] === '0') {
      hex = hex.substr(0, hex.length - 1);
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

  static generate(secret: string, counter?: number) {
    secret = secret.replace(/\s/g, '');
    let len = 6;
    let b26 = false;
    let key = '';
    if (/^[a-z2-7]+=*$/.test(secret.toLowerCase())) {
      key = this.base32tohex(secret);
    } else if (/^[0-9a-f]+$/.test(secret.toLowerCase())) {
      key = secret;
    } else if (/^bliz\-/.test(secret.toLowerCase())) {
      key = this.base32tohex(secret.substr(5));
      len = 8;
    } else if (/^blz\-/.test(secret.toLowerCase())) {
      key = this.base32tohex(secret.substr(4));
      len = 8;
    } else if (/^stm\-/.test(secret.toLowerCase())) {
      key = this.base32tohex(secret.substr(4));
      len = 10;
      b26 = true;
    }
    if (counter === undefined) {
      let epoch = Math.round(new Date().getTime() / 1000.0);
      if (localStorage.offset) {
        epoch = epoch + Number(localStorage.offset);
      }
      counter = Math.floor(epoch / 30);
    }

    const time = this.leftpad(this.dec2hex(counter), 16, '0');

    // external library for SHA functionality
    const hmacObj = new jsSHA('SHA-1', 'HEX');
    hmacObj.setHMACKey(key, 'HEX');
    hmacObj.update(this.hex2str(time));
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
