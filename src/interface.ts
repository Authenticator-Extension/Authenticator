export enum OPTType {
  topt = 1,
  hopt,
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
  encrypted: boolean;
  create(type: OPTType, issuer: string, secret: string, account: string): void;
  update(): void;
  delete(): void;
}