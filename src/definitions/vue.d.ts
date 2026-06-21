/* eslint-disable @typescript-eslint/no-explicit-any */
import { Store } from "vuex";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    // Only in Popup
    $store: Store<any>;
    // Only in Import
    $entries: OTPEntryInterface[];
    $encryption: EncryptionInterface;
    // In all
    i18n: { [key: string]: string };
  }
}
