import * as argon2 from "argon2-browser";

export class argon {
  static async hash(value: string) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const hash = await argon2.hash({
      pass: value,
      salt,
      mem: 1024 * 16,
      type: argon2.ArgonType.Argon2id
    });

    return hash.encoded;
  }

  static compareHash(hash: string, value: string) {
    return new Promise((resolve: (value: boolean) => void) => {
      argon2
        .verify({
          pass: value,
          encoded: hash
        })
        .then(() => resolve(true))
        .catch((e: { message: string; code: number }) => {
          console.error("Error decoding hash", e);
          resolve(false);
        });
    });
  }
}
