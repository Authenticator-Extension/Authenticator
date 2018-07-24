/* tslint:disable:no-reference */
/// <reference path="./encryption.ts" />

enum OTPType {
  totp = 1,
  hotp,
  battle,
  steam,
  hex,
  hhex
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
  period: number;
  create(encryption: Encryption): Promise<void>;
  update(encryption: Encryption): Promise<void>;
  next(encryption: Encryption): Promise<void>;
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
  counter: number;
  period?: number;
}

/* tslint:disable-next-line:interface-name */
interface I18nMessage {
  [key: string]: {message: string, description: string};
}

interface UIConfig {
  el?: string;
  data?: {
    /* tslint:disable-next-line:no-any */
    [name: string]: any
  };
  methods?: {
    /* tslint:disable-next-line:no-any */
    [name: string]: (...arg: any[]) => any
  };
  /* tslint:disable-next-line:no-any */
  ready?: (...arg: any[]) => any;
}
