interface BackupProvider {
  upload(encryption: IEncryption): Promise<boolean>;
  getUser(): Promise<string>;
}
