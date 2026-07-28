// Compatibility shim that decrypts crypto-js AES ciphertext WITHOUT crypto-js,
// so old storage / v1-v3 key blobs / imported legacy backups keep opening after
// crypto-js is removed. This is a security-boundary, backward-compatibility
// module: it MUST stay byte-for-byte equivalent to the crypto-js it replaces.
// Do not "modernise" the KDF or padding here -- old ciphertext was written with
// exactly these parameters and changing them makes existing data undecryptable.
//
// crypto-js `CryptoJS.AES.decrypt(base64, passwordString)` uses OpenSSL framing:
//   "Salted__" (8 bytes) + salt (8 bytes) + AES-256-CBC ciphertext (PKCS7)
// with the key/IV derived via EVP_BytesToKey(MD5, iterations=1). Verified
// against node_modules/crypto-js {cipher-core,evpkdf}.js at migration time.
//
// Leaf module: only depends on @noble/hashes. Do NOT import storage/otp/etc. --
// those form an import cycle that is load-order sensitive under the in-browser
// mocha runner.
import { md5 } from "@noble/hashes/legacy.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

// "Salted__" magic prefix, as raw bytes.
const SALTED_MAGIC = [0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f];

const KEY_SIZE = 32; // AES-256
const IV_SIZE = 16; // AES block size
const SALT_SIZE = 8; // OpenSSL salt length

// Returns a fresh ArrayBuffer-backed view (not ArrayBufferLike), so the result
// satisfies WebCrypto's BufferSource without a copy at the call site.
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// EVP_BytesToKey with MD5 and a single iteration, matching crypto-js's default
// OpenSSL KDF (evpkdf.js: iterations=1, hasher=MD5). Produces KEY_SIZE + IV_SIZE
// bytes of key material:
//   D_1 = MD5(password || salt)
//   D_i = MD5(D_{i-1} || password || salt)
// concatenated until enough bytes are available.
function evpBytesToKey(
  password: Uint8Array,
  salt: Uint8Array,
): { key: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> } {
  const target = KEY_SIZE + IV_SIZE;
  let derived: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let block: Uint8Array = new Uint8Array(0);
  while (derived.length < target) {
    // D_i = MD5(D_{i-1} || password || salt); D_0 is empty.
    block = md5(concat(concat(block, password), salt));
    derived = concat(derived, block);
  }
  return {
    key: derived.slice(0, KEY_SIZE),
    iv: derived.slice(KEY_SIZE, KEY_SIZE + IV_SIZE),
  };
}

// Decrypt to raw plaintext bytes, or null on any failure (bad framing, wrong
// password -> PKCS7 padding rejection by WebCrypto, malformed base64, etc.).
// crypto-js silently produced garbage / an empty string on a wrong password;
// here WebCrypto's AES-CBC almost always rejects invalid PKCS7 padding instead,
// so this converges wrong-password failures to null. The callers already treat
// wrong-password as "failed" (null/empty), so this is a strictly safer outcome.
async function legacyDecryptToBytes(
  data: string,
  password: string,
): Promise<Uint8Array | null> {
  try {
    const raw = base64ToBytes(data);
    // Require the OpenSSL "Salted__" header. crypto-js only omits the salt when
    // handed a raw key WordArray (never a password string); with a missing salt
    // it would fall back to a *random* salt and decrypt to garbage, which our
    // callers map to failure anyway -- so treat missing framing as failure.
    if (raw.length < SALTED_MAGIC.length + SALT_SIZE) {
      return null;
    }
    for (let i = 0; i < SALTED_MAGIC.length; i++) {
      if (raw[i] !== SALTED_MAGIC[i]) {
        return null;
      }
    }
    const salt = raw.slice(
      SALTED_MAGIC.length,
      SALTED_MAGIC.length + SALT_SIZE,
    );
    const ciphertext = raw.slice(SALTED_MAGIC.length + SALT_SIZE);

    const { key, iv } = evpBytesToKey(utf8ToBytes(password), salt);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      "AES-CBC",
      false,
      ["decrypt"],
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      ciphertext,
    );
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}

// UTF-8 string form -- the exact equivalent of crypto-js
//   CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8)
// crypto-js's Utf8 decoder THROWS on invalid UTF-8; TextDecoder with fatal:true
// mirrors that (caught -> ""). Returns "" on any failure so callers can keep
// their existing `decrypted || null` idiom.
export async function legacyDecrypt(
  data: string,
  password: string,
): Promise<string> {
  const bytes = await legacyDecryptToBytes(data, password);
  if (bytes === null) {
    return "";
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "";
  }
}

// Hex string form -- the exact equivalent of crypto-js
//   CryptoJS.AES.decrypt(data, password).toString()
// (WordArray.toString() defaults to the Hex encoder, NOT Utf8). Used for the v2
// key blobs, whose decrypted value is consumed as a hex string downstream.
// Returns "" on any failure.
export async function legacyDecryptToHex(
  data: string,
  password: string,
): Promise<string> {
  const bytes = await legacyDecryptToBytes(data, password);
  if (bytes === null) {
    return "";
  }
  return bytesToHex(bytes);
}
