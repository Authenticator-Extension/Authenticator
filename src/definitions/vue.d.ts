import Vue from 'vue'
import { Store } from 'vuex';

declare module 'vue/types/vue' {
  interface Vue {
    $store: Store<any>;
    $dragula: any;
    i18n: { [key: string]: string };
  }
}
