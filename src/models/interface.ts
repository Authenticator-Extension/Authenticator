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
  code: string;
  create(encryption: Encription): Promise<void>;
  update(encryption: Encription): Promise<void>;
  next(encryption: Encription): Promise<void>;
  delete(): Promise<void>;
  generate(): void;
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

/* tslint:disable-next-line:interface-name */
interface I18nMessage {
  [key: string]: {message: string, description: string};
}