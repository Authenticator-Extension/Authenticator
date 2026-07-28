import { createApp } from "vue";
import OptionsView from "./components/Options.vue";
import { loadI18nMessages } from "./store/i18n";

async function init() {
  const app = createApp(OptionsView);
  // i18n
  app.config.globalProperties.i18n = await loadI18nMessages();
  app.mount("#options");
}

init();
