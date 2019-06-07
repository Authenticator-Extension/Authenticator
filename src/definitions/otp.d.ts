declare enum OTPType {
    totp = 1,
    hotp,
    battle,
    steam,
    hex,
    hhex
}

interface IOTPEntry {
    type: OTPType;
    index: number;
    issuer: string;
    secret: string;
    account: string;
    hash: string;
    counter: number;
    code: string;
    period: number;
    create(encryption: IEncryption): Promise<void>;
    update(encryption: IEncryption): Promise<void>;
    next(encryption: IEncryption): Promise<void>;
    delete(): Promise<void>;
    generate(): void;
}

interface IEncryption {
    getEncryptedSecret(secret: string): string;
    getDecryptedSecret(secret: string, hash: string): string;
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
