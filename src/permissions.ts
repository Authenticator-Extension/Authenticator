// Vue
import { createApp } from "vue";
import { createPinia, setActivePinia } from "pinia";

// Components
import PermissionsView from "./components/Permissions.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { usePermissionsStore } from "./store/Permissions";

async function init() {
  // Pinia
  const pinia = createPinia();
  setActivePinia(pinia);
  const permissionsStore = usePermissionsStore();
  await permissionsStore.init();

  const app = createApp(PermissionsView);
  app.use(pinia);
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
