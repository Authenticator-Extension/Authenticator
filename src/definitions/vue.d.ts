import Vue from "vue";
import { Store } from "vuex";

declare module "vue/types/vue" {
  interface Vue {
    // Only in Popup
    $store: Store<any>;
    $dragula: any;
    // Only in Import
    $entries: IOTPEntry[];
    $encryption: IEncryption;
    // In all
    i18n: { [key: string]: string };
  }
}
