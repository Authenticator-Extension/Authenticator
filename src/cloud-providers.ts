export const CLOUD_PROVIDER_ENABLED = Object.freeze({
  dropbox: true,
  drive: false,
  onedrive: false,
} as const);

export type CloudProviderId = keyof typeof CLOUD_PROVIDER_ENABLED;

export function isCloudProviderEnabled(
  provider: string,
): provider is CloudProviderId {
  return (
    Object.prototype.hasOwnProperty.call(CLOUD_PROVIDER_ENABLED, provider) &&
    CLOUD_PROVIDER_ENABLED[provider as CloudProviderId] === true
  );
}

export function generateDropboxOAuthState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function isValidDropboxOAuthState(
  expectedState: string,
  callbackState: string | null,
): boolean {
  return callbackState !== null && callbackState === expectedState;
}
