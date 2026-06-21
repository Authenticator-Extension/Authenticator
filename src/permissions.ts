// Vue
import { createApp } from "vue";
import { createStore } from "vuex";

// Components
import PermissionsView from "./components/Permissions.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { Permissions } from "./store/Permissions";

async function init() {
  // State
  const store = createStore({
    strict: process.env.NODE_ENV !== "production",
    modules: {
      permissions: await new Permissions().getModule(),
    },
  });

  const app = createApp(PermissionsView);
  app.use(store);
  // i18n
  app.config.globalProperties.i18n = await loadI18nMessages();
  // Load common components globally
  for (const component of CommonComponents) {
    app.component(component.name, component.component);
  }

  const instance = app.mount("#permissions");

  // Set title
  try {
    document.title = instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }
}

init();
