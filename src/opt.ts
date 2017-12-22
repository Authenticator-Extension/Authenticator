import * as CryptoJS from 'crypto-js';
import {authenticator} from 'otplib';

import {OPT, OPTType} from './interface';

export class OPTEntry implements OPT {
  type: OPTType;
  index: number;
  issuer: string;
  secret: string;
  account: string;
  hash: string;
  encrypted: boolean;

  create(type: OPTType, issuer: string, secret: string, account: string) {
    this.type = type;
    this.issuer = issuer;
    this.secret = secret;
    this.account = account;
    this.hash = CryptoJS.MD5(secret).toString();
  }

  update() {}
  delete() {}
}