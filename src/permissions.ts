// Vue
import Vue from "vue";
import Vuex from "vuex";

// Components
import PermissionsView from "./components/Permissions.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { Permissions } from "./store/Permissions";

async function init() {
  // i18n
  Vue.prototype.i18n = await loadI18nMessages();

  // Load modules
  Vue.use(Vuex);

  // Load common components globally
  for (const component of CommonComponents) {
    Vue.component(component.name, component.component);
  }

  // State
  const store = new Vuex.Store({
    modules: {
      permissions: await new Permissions().getModule(),
    },
  });

  const instance = new Vue({
    render: (h) => h(PermissionsView),
    store,
  }).$mount("#permissions");

  // Set title
  try {
    document.title = instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }
}

init();
