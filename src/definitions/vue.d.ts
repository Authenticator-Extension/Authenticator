// `export {}` keeps this file a module so the block below AUGMENTS
// @vue/runtime-core. Without it the file is a script and `declare module`
// becomes an ambient declaration that SHADOWS the real module, erasing vue's
// re-exported members (ref/computed/...) program-wide. (An `import` from the
// old state-management library used to provide this module scope; it was
// removed during the Pinia migration.)
export {};

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    // Only in Import
    $entries: OTPEntryInterface[];
    $encryption: EncryptionInterface;
    // In all
    i18n: { [key: string]: string };
  }
}
