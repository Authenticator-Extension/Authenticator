import { legacyDecrypt } from "./legacy-decrypt";

// New ciphertext is authenticated AES-GCM via WebCrypto, tagged with this
// prefix so it is self-describing. Legacy ciphertext is crypto-js AES-CBC
// (OpenSSL "Salted__" framing, base64 starting "U2FsdGVkX1"); it stays readable
// for old storage and backups and upgrades to GCM the next time it is written.
const GCM_PREFIX = "v4:";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// Prefix-aware decrypt shared by the Encryption class and the backup importer.
// GCM throws on a wrong key / tampered data (auth tag); we surface that as null
// like the legacy path. Returns null on any failure.
export async function decryptString(
  data: string,
  password: string,
): Promise<string | null> {
  if (data.startsWith(GCM_PREFIX)) {
    try {
      const combined = base64ToBytes(data.slice(GCM_PREFIX.length));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const key = await deriveKey(password);
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );
      return new TextDecoder().decode(plaintext);
    } catch (error) {
      return null;
    }
  }
  // legacy AES-CBC (was crypto-js; now a crypto-js-free EVP/AES-CBC shim)
  const decrypted = await legacyDecrypt(data, password);
  return decrypted || null;
}

export class Encryption implements EncryptionInterface {
  private password: string;
  private keyId: string;
  private keyPromise?: Promise<CryptoKey>;

  constructor(hash: string, keyId: string) {
    this.password = hash;
    this.keyId = keyId;
    // Derive eagerly. These instances get stored in the reactive Vuex store
    // (state.encryption / entry.encryption); if getKey() lazily assigned
    // this.keyPromise later, that write would mutate reactive state during an
    // await -- outside a mutation handler -- and trip Vuex strict mode.
    if (hash) {
      this.keyPromise = deriveKey(hash);
    }
  }

  // Derive a 256-bit AES-GCM key from the (high-entropy argon2) saltedHash.
  // Cached per instance.
  private getKey(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = deriveKey(this.password);
    }
    return this.keyPromise;
  }

  async getEncryptedString(data: string): Promise<string> {
    if (!this.password) {
      return data;
    }
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(data),
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return GCM_PREFIX + bytesToBase64(combined);
  }

  async decryptSecretString(secret: string): Promise<string | null> {
    const decryptedSecret = await decryptString(secret, this.password);
    if (!decryptedSecret) {
      return null;
    }

    if (decryptedSecret.length < 8) {
      return null;
    }

    if (
      !/^[a-z2-7]+=*$/i.test(decryptedSecret) &&
      !/^[0-9a-f]+$/i.test(decryptedSecret) &&
      !/^blz-/.test(decryptedSecret) &&
      !/^bliz-/.test(decryptedSecret) &&
      !/^stm-/.test(decryptedSecret)
    ) {
      return null;
    }

    return decryptedSecret;
  }

  async decryptEncSecret(
    entry: OTPEntryInterface,
  ): Promise<RawOTPStorage | null> {
    if (!entry.encData) {
      return null;
    }
    const decryptedData = await decryptString(entry.encData, this.password);
    if (!decryptedData) {
      return null;
    }
    try {
      return JSON.parse(decryptedData);
    } catch (error) {
      return null;
    }
  }

  getEncryptionStatus(): boolean {
    return Boolean(this.password);
  }

  updateEncryptionPassword(password: string) {
    this.password = password;
    this.keyPromise = undefined;
  }

  setEncryptionKeyId(id: string): void {
    this.keyId = id;
  }

  getEncryptionKeyId(): string {
    return this.keyId;
  }
}
