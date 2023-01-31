import { EntryStorage } from "../models/storage";
import { InsightLevel, AdvisorInsight } from "../models/advisor";

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
      const LocalStorage =
        (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
      const hasEncryptedEntry = await EntryStorage.hasEncryptionKey();
      return hasEncryptedEntry && !Number(LocalStorage.autolock);
    },
  },
  {
    id: "browserSyncNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_browser_sync_not_enabled"
    ),
    validation: async () => {
      const LocalStorage =
        (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
      const storageArea = LocalStorage.storageLocation;
      return storageArea !== "sync";
    },
  },
  {
    id: "autoFillNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_auto_fill_not_enabled"
    ),
    validation: async () => {
      const LocalStorage =
        (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
      return LocalStorage.autofill !== "true" && LocalStorage.autofill !== true;
    },
  },
  {
    id: "smartFilterNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_smart_filter_not_enabled"
    ),
    validation: async () => {
      const LocalStorage =
        (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
      return (
        LocalStorage.smartFilter === "false" ||
        LocalStorage.smartFilter === false
      );
    },
  },
];

export class Advisor implements Module {
  async getModule() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    return {
      state: {
        insights: await this.getInsights(),
        ignoreList: JSON.parse(LocalStorage.advisorIgnoreList || "[]"),
      },
      mutations: {
        dismissInsight: async (state: AdvisorState, insightId: string) => {
          state.ignoreList.push(insightId);
          LocalStorage.advisorIgnoreList = state.ignoreList;
          chrome.storage.local.set({ LocalStorage });

          state.insights = await this.getInsights();
        },
        clearIgnoreList: async (state: AdvisorState) => {
          state.ignoreList = [];
          LocalStorage.advisorIgnoreList = undefined;
          chrome.storage.local.set({ LocalStorage });

          state.insights = await this.getInsights();
        },
        updateInsight: async (state: AdvisorState) => {
          state.insights = await this.getInsights();
          state.ignoreList =
            typeof LocalStorage.advisorIgnoreList === "string"
              ? JSON.parse(LocalStorage.advisorIgnoreList || "[]")
              : LocalStorage.advisorIgnoreList || [];
        },
      },
      namespaced: true,
    };
  }

  private async getInsights() {
    const LocalStorage =
      (await chrome.storage.local.get("LocalStorage")).LocalStorage || {};
    const advisorIgnoreList: string[] =
      typeof LocalStorage.advisorIgnoreList === "string"
        ? JSON.parse(LocalStorage.advisorIgnoreList || "[]")
        : LocalStorage.advisorIgnoreList || [];

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
      (insightData) => new AdvisorInsight(insightData)
    );
  }
}
