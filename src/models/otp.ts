import { KeyUtilities } from "./key-utilities";
import { UserSettings } from "./settings";
import { EntryStorage } from "./storage";

export enum OTPType {
  PLACEHOLDER_DO_NOT_USE, // https://github.com/Authenticator-Extension/Authenticator/pull/1283#issuecomment-2382842440
  totp,
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

export enum DataType {
  OTPStorage = "OTPStorage",
  EncOTPStorage = "EncOTPStorage",
  Key = "Key",
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
  account: string;
  hash: string;
  counter: number;
  period: number;
  digits: number;
  algorithm: OTPAlgorithm;
  pinned: boolean;
  encryption?: EncryptionInterface;
  encData?: string;
  encSecret?: string;
  keyId?: string;
  code = "&bull;&bull;&bull;&bull;&bull;&bull;";

  constructor(
    entry:
      | {
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
        }
      | {
          encrypted: true;
          keyId: string;
          encData: string;
          hash: string;
          index: number;
        },
    encryption?: EncryptionInterface
  ) {
    this.encryption = encryption;
    this.index = entry.index;

    if ("keyId" in entry) {
      this.encData = entry.encData;
      this.secret = null;
      this.hash = entry.hash;
      this.keyId = entry.keyId;

      // defaults
      this.type = OTPType.totp;
      this.issuer = "";
      this.account = "";
      this.counter = 0;
      this.period = 30;
      this.digits = 6;
      this.algorithm = OTPAlgorithm.SHA1;
      this.pinned = false;
      return;
    } else if (entry.encrypted) {
      // v2 encryption backwards compat logic
      this.secret = null;
      this.encSecret = entry.secret;
    } else {
      this.secret = entry.secret;
    }

    this.type = entry.type;
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
    if (entry.hash) {
      this.hash = entry.hash;
    } else {
      this.hash = crypto.randomUUID();
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

  changeEncryption(encryption: EncryptionInterface) {
    if (!this.secret) {
      return;
    }

    this.encryption = encryption;
    return;
  }

  applyEncryption(encryption: EncryptionInterface) {
    if (!encryption || !encryption.getEncryptionStatus()) {
      return;
    }

    if (this.encSecret) {
      // v2 encryption
      this.secret = encryption.decryptSecretString(this.encSecret);
      if (this.secret) {
        this.encSecret = "";
      }
      return;
    }

    // check if its a rawotpstorage
    const decryptedData = encryption.decryptEncSecret(this);
    if (decryptedData === null) {
      return;
    }

    if (decryptedData?.dataType !== "OTPStorage") {
      console.warn("Decrypt successful, but malformed encData!", this.hash);
    }

    if (decryptedData.hash !== this.hash) {
      console.warn(
        "Decrypt successful, but hash mismatch!",
        this.hash,
        decryptedData.hash
      );
    }

    this.account = decryptedData.account || "";
    // @ts-expect-error need a better way to do this
    this.algorithm = OTPAlgorithm[decryptedData.algorithm] || OTPAlgorithm.SHA1;
    this.counter = decryptedData.counter || 0;
    this.digits = decryptedData.digits || 6;
    this.issuer = decryptedData.issuer || "";
    this.period = decryptedData.period || 30;
    this.pinned = decryptedData.pinned || false;
    this.secret = decryptedData.secret;
    this.type =
      OTPType[decryptedData.type as keyof typeof OTPType] || OTPType.totp;

    if (this.type !== OTPType.hotp && this.type !== OTPType.hhex) {
      this.generate();
    }

    this.encryption = encryption;
    this.encData = "";
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
    this.hash = crypto.randomUUID();
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

    if (!this.secret && !this.encData) {
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
        console.warn("Invalid secret.", error);
      }
    }
  }
}
