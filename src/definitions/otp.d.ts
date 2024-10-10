declare enum OTPType {
  totp = "totp",
  hotp = "hotp",
  battle = "battle",
  steam = "steam",
  hex = "hex",
  hhex = "hhex",
}

interface OTPEntryInterface {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string | null;
  account: string;
  hash: string;
  counter: number;
  code: string;
  period: number;
  digits: number;
  algorithm: number; // OTPAlgorithm
  pinned: boolean;
  encData?: string;
  encryption?: EncryptionInterface;
  create(): Promise<void>;
  update(): Promise<void>;
  next(): Promise<void>;
  applyEncryption(encryption: EncryptionInterface): void;
  changeEncryption(encryption: EncryptionInterface): void;
  delete(): Promise<void>;
  generate(): void;
  genUUID(): void;
}

interface EncryptionInterface {
  getEncryptedString(data: string): string;
  decryptSecretString(entry: string): string | null;
  decryptEncSecret(entry: OTPEntryInterface): RawOTPStorage | null;
  getEncryptionStatus(): boolean;
  updateEncryptionPassword(password: string): void;
  getEncryptionKeyId(): string;
  setEncryptionKeyId(id: string): void;
}

interface RawOTPStorage {
  dataType?: "OTPStorage";
  account?: string;
  encrypted: boolean;
  keyId?: string;
  hash: string;
  index: number;
  issuer?: string;
  secret: string;
  type: OTPType;
  counter?: number;
  period?: number;
  digits?: number;
  algorithm?: string;
  pinned?: boolean;
}

interface EncOTPStorage {
  dataType: "EncOTPStorage";
  keyId: string;
  data: string;
  index: number;
}

type OTPStorage = RawOTPStorage | EncOTPStorage;

interface OldKey {
  enc: string;
  hash: string;
}

interface Key {
  dataType: "Key";
  // UUID
  id: string;
  // Salt used to generate encryption key
  salt: string;
  // Hash of the encryption key
  hash: string;
  version: 3;
}
