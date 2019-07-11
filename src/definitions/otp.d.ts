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
  create(encryption: IEncryption): Promise<void>;
  update(encryption: IEncryption): Promise<void>;
  next(encryption: IEncryption): Promise<void>;
  applyEncryption(encryption: IEncryption): void;
  delete(): Promise<void>;
  generate(): void;
}

interface IEncryption {
  getEncryptedSecret(entry: IOTPEntry): string;
  getEncryptedString(data: string): string;
  getDecryptedSecret(entry: OTPStorage): string | null;
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
