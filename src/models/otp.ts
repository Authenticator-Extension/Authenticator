import { Encryption } from "./encryption";
import { KeyUtilities } from "./key-utilities";
import { EntryStorage } from "./storage";
import { argon } from "./argon";
import * as CryptoJS from "crypto-js";

export enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex,
  hhex
}

export class OTPEntry implements IOTPEntry {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string | null;
  encSecret: string | null;
  account: string;
  hash: string;
  counter: number;
  period: number;
  code = "&bull;&bull;&bull;&bull;&bull;&bull;";

  constructor(
    entry: {
      account: string;
      encrypted: boolean;
      hash: string;
      index: number;
      issuer: string;
      secret: string;
      type: OTPType;
      counter: number;
      period?: number;
    },
    encryption?: Encryption
  ) {
    this.type = entry.type;
    this.index = entry.index;
    this.issuer = entry.issuer;
    this.account = entry.account;
    if (entry.encrypted) {
      this.encSecret = entry.secret;
      this.secret = null;
    } else {
      this.secret = entry.secret;
      this.encSecret = null;
      if (encryption && encryption.getEncryptionStatus()) {
        this.encSecret = encryption.getEncryptedString(this.secret);
      }
    }
    this.hash = entry.hash;
    this.counter = entry.counter;
    if (this.type === OTPType.totp && entry.period) {
      this.period = entry.period;
    } else {
      this.period = 30;
    }
    if (this.type !== OTPType.hotp && this.type !== OTPType.hhex) {
      this.generate();
    }
  }

  async create() {
    await EntryStorage.add(this);
    return;
  }

  async update() {
    await EntryStorage.update(this);
    return;
  }

  async applyEncryption(encryption: Encryption) {
    const secret = this.encSecret ? this.encSecret : null;
    if (secret) {
      this.secret = await encryption.getDecryptedSecret({
        hash: this.hash,
        secret
      });
      if (this.type !== OTPType.hotp && this.type !== OTPType.hhex) {
        this.generate();
      }
    }
    return;
  }

  async delete() {
    await EntryStorage.delete(this);
    return;
  }

  async next() {
    if (this.type !== OTPType.hotp && this.type !== OTPType.hhex) {
      return;
    }
    this.generate();
    if (this.secret !== null) {
      this.counter++;
      await this.update();
    }
    return;
  }

  async rehash() {
    const secret = this.secret;
    if (!secret) {
      return;
    }

    if (this.hash !== CryptoJS.MD5(secret).toString()) {
      return;
    }

    const newHash = await argon.hash(secret);
    await this.delete();
    this.hash = newHash;
    await this.create();
  }

  generate() {
    if (!this.secret && !this.encSecret) {
      this.code = "Invalid";
    } else if (!this.secret) {
      this.code = "Encrypted";
    } else {
      try {
        this.code = KeyUtilities.generate(
          this.type,
          this.secret,
          this.counter,
          this.period
        );
      } catch (error) {
        this.code = "Invalid";
        if (parent) {
          parent.postMessage(`Invalid secret: [${this.secret}]`, "*");
        }
      }
    }
  }
}
