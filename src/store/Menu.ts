import { defineStore } from "pinia";
import { ref } from "vue";
import { UserSettings } from "../models/settings";
import { ManagedStorage } from "../models/storage";

// Map any stored theme (incl. the retired normal/simple/flat) to a current one.
function normalizeTheme(value?: string): string {
  switch (value) {
    case "dark":
    case "auto":
    case "accessibility":
    case "compact":
    case "light":
      return value;
    default:
      return "light";
  }
}

function resize(zoom: number) {
  if (zoom !== 100) {
    document.body.style.marginBottom = 580 * (zoom / 100 - 1) + "px";
    document.body.style.marginRight = 360 * (zoom / 100 - 1) + "px";
    document.body.style.transform = "scale(" + zoom / 100 + ")";
  }
}

export const useMenuStore = defineStore("menu", () => {
  const version = ref(chrome.runtime.getManifest()?.version || "0.0.0");
  const zoom = ref(100);
  const useAutofill = ref(false);
  const smartFilter = ref(false);
  const enableContextMenu = ref(false);
  const theme = ref("light");
  const onboardingComplete = ref(false);
  const autolock = ref(30);
  const backupDisabled = ref(false);
  const exportDisabled = ref(false);
  const enforcePassword = ref(false);
  const enforceAutolock = ref(false);
  const storageArea = ref<"sync" | "local" | undefined>(undefined);
  const feedbackURL = ref<string | undefined>(undefined);
  const passwordPolicy = ref<string | undefined>(undefined);
  const passwordPolicyHint = ref<string | undefined>(undefined);

  // Populates state from UserSettings/ManagedStorage; the caller must await
  // this before the popup mounts so components never observe the pre-init
  // defaults above.
  async function init() {
    await UserSettings.updateItems();

    zoom.value = Number(UserSettings.items.zoom) || 100;
    useAutofill.value = UserSettings.items.autofill === true;
    smartFilter.value = UserSettings.items.smartFilter === true;
    enableContextMenu.value = UserSettings.items.enableContextMenu === true;
    theme.value = normalizeTheme(UserSettings.items.theme);
    onboardingComplete.value = UserSettings.items.onboardingComplete === true;
    autolock.value = Number(UserSettings.items.autolock) || 30;
    backupDisabled.value = await ManagedStorage.get("disableBackup", false);
    exportDisabled.value = await ManagedStorage.get("disableExport", false);
    enforcePassword.value = await ManagedStorage.get("enforcePassword", false);
    enforceAutolock.value = await ManagedStorage.get("enforceAutolock", false);
    storageArea.value = await ManagedStorage.get<"sync" | "local">(
      "storageArea",
    );
    feedbackURL.value = await ManagedStorage.get<string>("feedbackURL");
    passwordPolicy.value = await ManagedStorage.get<string>("passwordPolicy");
    passwordPolicyHint.value =
      await ManagedStorage.get<string>("passwordPolicyHint");

    resize(zoom.value);
  }

  function setZoom(newZoom: number) {
    zoom.value = newZoom;
    UserSettings.items.zoom = newZoom;
    UserSettings.commitItems();
    resize(newZoom);
  }

  function setAutofill(value: boolean) {
    useAutofill.value = value;
    UserSettings.items.autofill = value;
    UserSettings.commitItems();
  }

  function setSmartFilter(value: boolean) {
    smartFilter.value = value;
    UserSettings.items.smartFilter = value;
    UserSettings.commitItems();
  }

  function setEnableContextMenu(value: boolean) {
    enableContextMenu.value = value;
    UserSettings.items.enableContextMenu = value;
    UserSettings.commitItems();
  }

  function setTheme(value: string) {
    theme.value = value;
    UserSettings.items.theme = value;
    UserSettings.commitItems();
  }

  function setOnboardingComplete(value: boolean) {
    onboardingComplete.value = value;
    UserSettings.items.onboardingComplete = value;
    UserSettings.commitItems();
  }

  function setAutolock(value: number) {
    autolock.value = value;
    UserSettings.items.autolock = value;
    UserSettings.commitItems();
  }

  return {
    version,
    zoom,
    useAutofill,
    smartFilter,
    enableContextMenu,
    theme,
    onboardingComplete,
    autolock,
    backupDisabled,
    exportDisabled,
    enforcePassword,
    enforceAutolock,
    storageArea,
    feedbackURL,
    passwordPolicy,
    passwordPolicyHint,
    init,
    setZoom,
    setAutofill,
    setSmartFilter,
    setEnableContextMenu,
    setTheme,
    setOnboardingComplete,
    setAutolock,
  };
});
