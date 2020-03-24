interface BackupProvider {
  upload(encryption: EncryptionInterface): Promise<boolean>;
  getUser(): Promise<string>;
}
