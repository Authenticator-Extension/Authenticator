import Vue from "vue";
import OptionsView from "./components/Options.vue";
import { loadI18nMessages } from "./store/i18n";

async function init() {
  // i18n
  Vue.prototype.i18n = await loadI18nMessages();

  new Vue({
    render: (h) => h(OptionsView),
  }).$mount("#options");
}

init();
