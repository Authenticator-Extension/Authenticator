/* tslint:disable:no-reference */
/// <reference path="../../node_modules/@types/crypto-js/index.d.ts" />

class Encryption {
  private password: string;

  constructor(password: string) {
    this.password = password;
  }

  getEncryptedSecret(secret: string): string {
    if (!this.password) {
      return secret;
    }
    return CryptoJS.AES.encrypt(secret, this.password).toString();
  }

  getDecryptedSecret(secret: string): string {
    if (!this.password) {
      return secret;
    }

    try {
      const decryptedSecret = CryptoJS.AES.decrypt(secret, this.password)
                                  .toString(CryptoJS.enc.Utf8);
      return decryptedSecret || 'Encrypted';
    } catch (error) {
      return 'Encrypted';
    }
  }

  getEncryptionStatus(): boolean {
    return this.password ? true : false;
  }

  updateEncryptionPassword(password: string) {
    this.password = password;
  }
}