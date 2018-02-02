import {Encription} from './encryption';

export enum OPTType {
  totp = 1,
  hotp,
  battle,
  steam
}

export interface OPT {
  type: OPTType;
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

export interface OPTStorage {
  account: string;
  encrypted: boolean;
  hash: string;
  index: number;
  issuer: string;
  secret: string;
  type: string;
}