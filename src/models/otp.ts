import * as CryptoJS from 'crypto-js';

import {Encription} from './encryption';
import {OTP, OTPType} from './interface';
import {KeyUtilities} from './key-utilities';
import {Storage} from './storage';

export class OTPEntry implements OTP {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string;
  account: string;
  hash: string;
  counter: number;

  constructor(
      type: OTPType, issuer: string, secret: string, account: string,
      index: number) {
    this.type = type;
    this.index = index;
    this.issuer = issuer;
    this.secret = secret;
    this.account = account;
    this.hash = CryptoJS.MD5(secret).toString();
    this.counter = 0;
  }

  async create(encryption: Encription) {
    await Storage.add(encryption, this);
    return;
  }

  async update(
      encryption: Encription, issuer: string, account: string, index: number,
      counter: number) {
    this.issuer = issuer;
    this.account = account;
    this.index = index;
    this.counter = counter;
    Storage.update(encryption, this);
    return;
  }

  async delete() {
    Storage.delete(this);
    return;
  }

  async next(encryption: Encription) {
    if (this.type !== OTPType.hotp) {
      return;
    }
    this.counter++;
    await this.update(
        encryption, this.issuer, this.secret, this.index, this.counter);
    return;
  }

  generate() {
    return KeyUtilities.generate(this.secret);
  }
}