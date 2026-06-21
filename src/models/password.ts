import { BrowserStorage, isOldKey } from "./storage";

// Single argon-sandbox round-trip. Every request carries a unique id; the
// listener only accepts the reply that comes from our sandbox iframe and
// matches that id, then removes itself. This replaces the old per-call
// anonymous listeners that were never removed and resolved on whatever message
// arrived first (a correctness hazard when calls overlapped). A timeout turns a
// hung sandbox into a rejection instead of an indefinite wait.
function callArgonSandbox(message: {
  action: "hash" | "verify";
  [key: string]: unknown;
}): Promise<unknown> {
  const iframe = document.getElementById(
    "argon-sandbox"
  ) as HTMLIFrameElement | null;
  if (!iframe || !iframe.contentWindow) {
    throw new Error("argon-sandbox missing!");
  }
  const sandbox = iframe.contentWindow;
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== sandbox || !event.data || event.data.id !== id) {
        return;
      }
      window.removeEventListener("message", handler);
      clearTimeout(timer);
      resolve(event.data.response);
    };
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("argon2 sandbox timed out"));
    }, 60000);
    window.addEventListener("message", handler);
    // The sandbox iframe has an opaque origin, so "*" is required to post to it;
    // the event.source check above is what authenticates the reply.
    sandbox.postMessage({ ...message, id }, "*");
  });
}

export async function argonHash(
  value: string,
  salt: string
): Promise<string | undefined> {
  return (await callArgonSandbox({ action: "hash", value, salt })) as
    | string
    | undefined;
}

export async function argonVerify(
  value: string,
  hash: string
): Promise<boolean> {
  return (await callArgonSandbox({ action: "verify", value, hash })) as boolean;
}

// Verify a password using keys in BrowserStorage
export async function verifyPasswordUsingKeyID(
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

  return verifyPasswordUsingKey(key, password);
}

export async function verifyPasswordUsingKey(
  key: Key,
  password: string
): Promise<boolean> {
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
