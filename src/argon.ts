import argon2 from "argon2-browser";

function isExtensionOrigin(origin: string): boolean {
  return (
    origin.indexOf("chrome-extension://") === 0 ||
    origin.indexOf("safari-web-extension://") === 0 ||
    origin.indexOf("moz-extension://") === 0
  );
}

window.addEventListener("message", (event) => {
  const message = event.data;
  const source = event.source as Window;

  if (!source || !isExtensionOrigin(event.origin)) {
    return;
  }

  switch (message.action) {
    case "hash":
      Argon.hash(message.value, message.salt).then((hash) => {
        source.postMessage({ response: hash }, event.origin);
      });
      break;

    case "verify":
      Argon.compareHash(message.hash, message.value).then((result) => {
        source.postMessage({ response: result }, event.origin);
      });
      break;

    default:
      break;
  }
  return;
});

class Argon {
  static async hash(value: string, salt: string | Uint8Array) {
    const hash = await argon2.hash({
      pass: value,
      salt: salt,
      time: 2,
      mem: 1024 * 19,
      parallelism: 1,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id,
    });

    return hash.encoded;
  }

  static compareHash(hash: string, value: string) {
    return new Promise((resolve: (value: boolean) => void) => {
      argon2
        .verify({
          pass: value,
          encoded: hash,
        })
        .then(() => resolve(true))
        .catch((e: { message: string; code: number }) => {
          console.error("Error decoding hash", e);
          resolve(false);
        });
    });
  }
}
