import * as CryptoJS from "crypto-js";

export class Encryption implements IEncryption {
  private password: string;

  constructor(password: string) {
    this.password = password;
  }

  getEncryptedSecret(entry: IOTPEntry): string {
    if (entry.encSecret) {
      return entry.encSecret;
    } else if (entry.secret) {
      if (!this.password) {
        // Not encrypted, give unencrypted.
        return entry.secret;
      } else {
        // Not encrypted and password is set, encrypt.
        return CryptoJS.AES.encrypt(entry.secret, this.password).toString();
      }
    } else {
      console.error(entry);
      throw new Error("Invalid entry");
    }
  }

  getEncryptedString(data: string): string {
    if (!this.password) {
      return data;
    } else {
      return CryptoJS.AES.encrypt(data, this.password).toString();
    }
  }

  getDecryptedSecret(entry: { secret: string; hash: string }): string | null {
    try {
      if (entry.hash === CryptoJS.MD5(entry.secret).toString()) {
        return entry.secret;
      }

      let decryptedSecret = CryptoJS.AES.decrypt(
        entry.secret,
        this.password
      ).toString(CryptoJS.enc.Utf8);

      if (!decryptedSecret) {
        return null;
      }

      if (decryptedSecret.length < 8) {
        return null;
      }

      if (entry.hash === CryptoJS.MD5(decryptedSecret).toString()) {
        return decryptedSecret;
      }

      decryptedSecret = decryptedSecret.replace(/ /g, "");

      if (
        !/^[a-z2-7]+=*$/i.test(decryptedSecret) &&
        !/^[0-9a-f]+$/i.test(decryptedSecret) &&
        !/^blz\-/.test(decryptedSecret) &&
        !/^bliz\-/.test(decryptedSecret) &&
        !/^stm\-/.test(decryptedSecret)
      ) {
        return null;
      }

      console.warn(
        `Account ${entry.hash} may have secret ${decryptedSecret}, but hash did not match.`
      );
      return null;
    } catch (error) {
      return null;
    }
  }

  getEncryptionStatus(): boolean {
    return this.password ? true : false;
  }

  updateEncryptionPassword(password: string) {
    this.password = password;
  }
}
