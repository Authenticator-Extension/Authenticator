import { BrowserStorage, isOldKey } from "./storage";

export async function argonHash(
  value: string,
  salt: string
): Promise<string | undefined> {
  const iframe = document.getElementById("argon-sandbox");
  const message = {
    action: "hash",
    value,
    salt,
  };

  if (!iframe) {
    throw new Error("argon-sandbox missing!");
  }

  const argonPromise: Promise<string | undefined> = new Promise((resolve) => {
    window.addEventListener("message", (response) => {
      resolve(response.data.response);
    });
    // @ts-expect-error bad typings
    iframe.contentWindow.postMessage(message, "*");
  });

  return argonPromise;
}

export async function argonVerify(
  value: string,
  hash: string
): Promise<boolean> {
  const iframe = document.getElementById("argon-sandbox");
  const message = {
    action: "verify",
    value,
    hash,
  };

  if (!iframe) {
    throw new Error("argon-sandbox missing!");
  }

  const argonPromise: Promise<boolean> = new Promise((resolve) => {
    window.addEventListener("message", (response) => {
      resolve(response.data.response);
    });
    // @ts-expect-error bad typings
    iframe.contentWindow.postMessage(message, "*");
  });

  return argonPromise;
}

export async function verifyPassword(
  keyId: string,
  password: string
): Promise<boolean> {
  // Get key for current encryption
  const keys = await BrowserStorage.getKeys();
  if (isOldKey(keys)) {
    throw new Error(
      "v3 encryption not being used with verifyPassword. This should never happen!"
    );
  }

  const key = keys.find((key) => key.id === keyId);
  if (!key) {
    throw new Error(`Key ${keyId} not in BrowserStorage`);
  }

  // Hash password with argon
  const rawHash = await argonHash(password, key.salt);
  if (!rawHash) {
    throw new Error("argon2 did not return a hash!");
  }
  // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
  const possibleHash = rawHash.split("$")[5];

  // verify user password by comparing their password hash with the
  // hash of their password's hash
  return await argonVerify(possibleHash, key.hash);
}
