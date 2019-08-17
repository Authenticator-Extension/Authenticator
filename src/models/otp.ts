import { Encryption } from "./encryption";
import { KeyUtilities } from "./key-utilities";
import { EntryStorage } from "./storage";

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

  constructor(entry: {
    account: string;
    encrypted: boolean;
    hash: string;
    index: number;
    issuer: string;
    secret: string;
    type: OTPType;
    counter: number;
    period?: number;
  }) {
    this.type = entry.type;
    this.index = entry.index;
    this.issuer = entry.issuer;
    if (entry.encrypted) {
      this.encSecret = entry.secret;
      this.secret = null;
    } else {
      this.secret = entry.secret;
      this.encSecret = null;
    }
    this.account = entry.account;
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

  async create(encryption: Encryption) {
    await EntryStorage.add(encryption, this);
    return;
  }

  async update(encryption: Encryption) {
    await EntryStorage.update(encryption, this);
    return;
  }

  applyEncryption(encryption: Encryption) {
    const secret = this.encSecret ? this.encSecret : null;
    if (secret) {
      this.secret = encryption.getDecryptedSecret({ hash: this.hash, secret });
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

  async next(encryption: Encryption) {
    if (this.type !== OTPType.hotp && this.type !== OTPType.hhex) {
      return;
    }
    this.generate();
    if (this.secret !== null) {
      this.counter++;
      await this.update(encryption);
    }
    return;
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
