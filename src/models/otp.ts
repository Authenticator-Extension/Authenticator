import { Encryption } from "./encryption";
import { KeyUtilities } from "./key-utilities";
import { UserSettings } from "./settings";
import { EntryStorage } from "./storage";
import * as uuid from "uuid/v4";

export enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex,
  hhex,
}

export enum CodeState {
  Invalid = "-1",
  Encrypted = "-2",
}

export enum OTPAlgorithm {
  SHA1 = 1,
  SHA256,
  SHA512,
  GOST3411_2012_256,
  GOST3411_2012_512,
}

export interface OTPAlgorithmSpec {
  length: number;
}

export class OTPUtil {
  static getOTPAlgorithmSpec(otpAlgorithm: OTPAlgorithm): OTPAlgorithmSpec {
    switch (otpAlgorithm) {
      case OTPAlgorithm.GOST3411_2012_256:
        return { length: 256 };
      case OTPAlgorithm.GOST3411_2012_512:
        return { length: 512 };
      default:
        return { length: 0 };
    }
  }
}

export class OTPEntry implements OTPEntryInterface {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string | null;
  encSecret: string | null;
  account: string;
  hash: string;
  counter: number;
  period: number;
  digits: number;
  algorithm: OTPAlgorithm;
  pinned: boolean;
  code = "&bull;&bull;&bull;&bull;&bull;&bull;";

  constructor(
    entry: {
      account?: string;
      encrypted: boolean;
      index: number;
      issuer?: string;
      secret: string;
      type: OTPType;
      counter?: number;
      period?: number;
      hash?: string;
      digits?: number;
      algorithm?: OTPAlgorithm;
      pinned?: boolean;
    },
    encryption?: Encryption
  ) {
    this.type = entry.type;
    this.index = entry.index;
    if (entry.issuer) {
      this.issuer = entry.issuer;
    } else {
      this.issuer = "";
    }
    if (entry.account) {
      this.account = entry.account;
    } else {
      this.account = "";
    }
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
    if (entry.counter) {
      this.counter = entry.counter;
    } else {
      this.counter = 0;
    }
    if (entry.digits) {
      this.digits = entry.digits;
    } else {
      this.digits = 6;
    }
    if (entry.algorithm) {
      this.algorithm = entry.algorithm;
    } else {
      this.algorithm = OTPAlgorithm.SHA1;
    }
    if (entry.pinned) {
      this.pinned = entry.pinned;
    } else {
      this.pinned = false;
    }
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
        secret,
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
    this.hash = uuid();
  }

  generate() {
    const offset = UserSettings.items ? UserSettings.items.offset : 0;
    if (!UserSettings.items) {
      // browser storage is async, so we need to wait for it to load
      // and re-generate the code
      // don't change the code to async, it will break the mutation
      // for Accounts store to export data
      UserSettings.updateItems().then(() => {
        this.generate();
      });
    }

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
          this.period,
          this.digits,
          this.algorithm,
          offset
        );
      } catch (error) {
        this.code = CodeState.Invalid;
        console.log("Invalid secret.", error);
      }
    }
  }
}
