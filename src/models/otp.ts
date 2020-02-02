import { Encryption } from "./encryption";
import { KeyUtilities } from "./key-utilities";
import { EntryStorage } from "./storage";
import * as uuid from "uuid/v4";

export enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex,
  hhex
}

export enum CodeState {
  Invalid = "-1",
  Encrypted = "-2"
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
      index: number;
      issuer: string;
      secret: string;
      type: OTPType;
      counter: number;
      period?: number;
      hash?: string;
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

    if (entry.hash) {
      this.hash = entry.hash;
    } else {
      this.hash = uuid(); // UUID
    }
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

  changeEncryption(encryption: Encryption) {
    if (!this.secret) {
      return;
    }

    if (encryption.getEncryptionStatus()) {
      this.encSecret = encryption.getEncryptedString(this.secret);
    } else {
      this.encSecret = null;
    }
    return;
  }

  applyEncryption(encryption: Encryption) {
    const secret = this.encSecret ? this.encSecret : null;
    if (secret) {
      this.secret = encryption.getDecryptedSecret({
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

  genUUID() {
    // await this.delete();
    this.hash = uuid();
    // await this.create();
  }

  generate() {
    if (!this.secret && !this.encSecret) {
      this.code = CodeState.Invalid;
    } else if (!this.secret) {
      this.code = CodeState.Encrypted;
    } else {
      try {
        this.code = KeyUtilities.generate(
          this.type,
          this.secret,
          this.counter,
          this.period
        );
      } catch (error) {
        this.code = CodeState.Invalid;
        console.log("Invalid secret.", error);
      }
    }
  }
}
