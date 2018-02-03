/* tslint:disable:no-reference */
/// <reference path="./encryption.ts" />

enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex
}

interface OTP {
  type: OTPType;
  index: number;
  issuer: string;
  secret: string;
  account: string;
  hash: string;
  counter: number;
  create(encryption: Encription): Promise<void>;
  update(
      encryption: Encription, issuer: string, account: string, index: number,
      counter: number): Promise<void>;
  next(encryption: Encription): Promise<void>;
  delete(): Promise<void>;
  generate(): string;
}

interface OTPStorage {
  account: string;
  encrypted: boolean;
  hash: string;
  index: number;
  issuer: string;
  secret: string;
  type: string;
}