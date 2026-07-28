import { defineStore } from "pinia";
import { ref } from "vue";

export const useCurrentViewStore = defineStore("currentView", () => {
  const info = ref("");

  function changeView(viewName: string) {
    info.value = viewName;
  }

  return { info, changeView };
});
