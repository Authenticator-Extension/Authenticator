import Vue from 'vue'
import { Store } from 'vuex';

declare module 'vue/types/vue' {
  interface Vue {
    $store: Store<any>;
    i18n: { [key: string]: string };
  }
}
