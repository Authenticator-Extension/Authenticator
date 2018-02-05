/* tslint:disable:no-reference */
/// <reference path="../../node_modules/@types/crypto-js/index.d.ts" />
/// <reference path="./encryption.ts" />
/// <reference path="./interface.ts" />
/// <reference path="./key-utilities.ts" />

class OTPEntry implements OTP {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string;
  account: string;
  hash: string;
  counter: number;
  code: string;

  constructor(
      type: OTPType, issuer: string, secret: string, account: string,
      index: number, counter: number) {
    this.type = type;
    this.index = index;
    this.issuer = issuer;
    this.secret = secret;
    this.account = account;
    this.hash = CryptoJS.MD5(secret).toString();
    this.counter = counter;
    if (this.type !== OTPType.hotp) {
      this.generate();
    } else {
      this.code = '&bull;&bull;&bull;&bull;&bull;&bull;';
    }
  }

  async create(encryption: Encription) {
    await EntryStorage.add(encryption, this);
    return;
  }

  async update(encryption: Encription) {
    await EntryStorage.update(encryption, this);
    return;
  }

  async delete() {
    await EntryStorage.delete(this);
    return;
  }

  async next(encryption: Encription) {
    if (this.type !== OTPType.hotp) {
      return;
    }
    this.generate();
    this.counter++;
    await this.update(encryption);
    return;
  }

  generate() {
    if (this.secret === 'Encrypted') {
      this.code = 'Encrypted';
    } else {
      this.code = KeyUtilities.generate(this.type, this.secret, this.counter);
    }
  }
}