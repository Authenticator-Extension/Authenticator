interface IOTPEntry {
  type: number; // OTPType
  index: number;
  issuer: string;
  encSecret: string | null;
  secret: string | null;
  account: string;
  hash: string;
  counter: number;
  code: string;
  period: number;
  create(): Promise<void>;
  update(): Promise<void>;
  next(): Promise<void>;
  applyEncryption(encryption: IEncryption): Promise<void>;
  changeEncryption(encryption: IEncryption): Promise<void>;
  delete(): Promise<void>;
  generate(): void;
  rehash(encryption: IEncryption): Promise<void>;
}

interface IEncryption {
  getEncryptedString(data: string): string;
  getDecryptedSecret(entry: OTPStorage): Promise<string | null>;
  getEncryptionStatus(): boolean;
  updateEncryptionPassword(password: string): void;
}

interface OTPStorage {
  account: string;
  encrypted: boolean;
  hash: string;
  index: number;
  issuer: string;
  secret: string;
  type: string;
  counter: number;
  period?: number;
}
