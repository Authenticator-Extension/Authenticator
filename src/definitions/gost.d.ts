declare module "node-gost-crypto" {
  export class AlgorithmIndentifier {
    mode: string;
    name: string;
    version: number;
    length: number;
  }
  // eslint-disable-next-line @typescript-eslint/class-name-casing
  export class gostEngine {
    static getGostDigest(alg: AlgorithmIndentifier): GostDigest;
  }
  interface GostDigest {
    sign(key: Uint8Array, data: Uint8Array): number[];
    verify(key: Uint8Array, signature: Uint8Array, data: Uint8Array): boolean;
  }
}
