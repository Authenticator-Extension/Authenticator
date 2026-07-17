import { defineStore } from "pinia";
import { ref } from "vue";
import { EntryStorage } from "../models/storage";
import { InsightLevel, AdvisorInsight } from "../models/advisor";
import { StorageLocation, UserSettings } from "../models/settings";

const insightsData: AdvisorInsightInterface[] = [
  {
    id: "passwordNotSet",
    level: InsightLevel.danger,
    description: chrome.i18n.getMessage("advisor_insight_password_not_set"),
    validation: async () => {
      const hasEncryptedEntry = await EntryStorage.hasEncryptionKey();
      return !hasEncryptedEntry;
    },
  },
  {
    id: "autoLockNotSet",
    level: InsightLevel.warning,
    description: chrome.i18n.getMessage("advisor_insight_auto_lock_not_set"),
    validation: async () => {
      await UserSettings.updateItems();
      const hasEncryptedEntry = await EntryStorage.hasEncryptionKey();
      // an unset autolock falls back to the 30-min default (see setAutolock),
      // so only warn when the user has explicitly disabled it with 0 (#1281)
      return hasEncryptedEntry && Number(UserSettings.items.autolock) === 0;
    },
  },
  {
    id: "browserSyncNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_browser_sync_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      const storageArea = UserSettings.items.storageLocation;
      return storageArea !== StorageLocation.Sync;
    },
  },
  {
    id: "autoFillNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_auto_fill_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      return UserSettings.items.autofill !== true;
    },
  },
  {
    id: "smartFilterNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_smart_filter_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      return UserSettings.items.smartFilter === false;
    },
  },
];

// advisorIgnoreList may be stored as a JSON string (legacy) or an array;
// normalise to an array.
function parseIgnoreList(): string[] {
  const raw = UserSettings.items.advisorIgnoreList;
  return typeof raw === "string" ? JSON.parse(raw || "[]") : raw || [];
}

async function computeInsights(): Promise<AdvisorInsight[]> {
  await UserSettings.updateItems();
  const advisorIgnoreList = parseIgnoreList();

  const filteredInsightsData: AdvisorInsightInterface[] = [];

  for (const insightData of insightsData) {
    if (advisorIgnoreList.includes(insightData.id)) {
      continue;
    }

    const validation = await insightData.validation();

    if (validation) {
      filteredInsightsData.push(insightData);
    }
  }

  return filteredInsightsData.map(
    (insightData) => new AdvisorInsight(insightData),
  );
}

export const useAdvisorStore = defineStore("advisor", () => {
  const insights = ref<AdvisorInsight[]>([]);
  const ignoreList = ref<string[]>([]);

  // Populates state from UserSettings; the caller must await this before the
  // popup mounts so components never observe the pre-init defaults above.
  async function init() {
    await UserSettings.updateItems();
    // advisorIgnoreList may still be a legacy JSON string for users whose
    // settings predate the array format; parseIgnoreList() normalises it.
    ignoreList.value = parseIgnoreList();
    insights.value = await computeInsights();
  }

  async function dismissInsight(insightId: string) {
    ignoreList.value.push(insightId);
    UserSettings.items.advisorIgnoreList = ignoreList.value;
    await UserSettings.commitItems();

    insights.value = await computeInsights();
  }

  async function clearIgnoreList() {
    ignoreList.value = [];
    UserSettings.items.advisorIgnoreList = undefined;
    await UserSettings.commitItems();

    insights.value = await computeInsights();
  }

  async function updateInsight() {
    insights.value = await computeInsights();
    ignoreList.value = parseIgnoreList();
  }

  return {
    insights,
    ignoreList,
    init,
    dismissInsight,
    clearIgnoreList,
    updateInsight,
  };
});
