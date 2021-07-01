declare module "crypto-gost" {
  export class AlgorithmIndentifier {
    mode: string;
    name: string;
    version: number;
    length: number;
  }
  export class GostEngine {
    static getGostDigest(alg: AlgorithmIndentifier): GostDigest;
  }
  interface GostDigest {
    sign(key: Uint8Array, data: Uint8Array): number[];
  }
}
