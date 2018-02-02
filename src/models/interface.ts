import {Encription} from './encryption';

export enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam
}

export interface OTP {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string;
  account: string;
  hash: string;
  create(encryption: Encription): Promise<void>;
  update(
      encryption: Encription, issuer: string, account: string, index: number,
      counter: number): Promise<void>;
  next(encryption: Encription): Promise<void>;
  delete(): Promise<void>;
  generate(): string;
}

export interface OTPStorage {
  account: string;
  encrypted: boolean;
  hash: string;
  index: number;
  issuer: string;
  secret: string;
  type: string;
}