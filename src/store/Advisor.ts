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
      return hasEncryptedEntry && !Number(UserSettings.items.autolock);
    },
  },
  {
    id: "browserSyncNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_browser_sync_not_enabled"
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
      "advisor_insight_auto_fill_not_enabled"
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
      "advisor_insight_smart_filter_not_enabled"
    ),
    validation: async () => {
      await UserSettings.updateItems();
      return UserSettings.items.smartFilter === false;
    },
  },
];

export class Advisor implements Module {
  async getModule() {
    await UserSettings.updateItems();
    return {
      state: {
        insights: await this.getInsights(),
        ignoreList: UserSettings.items.advisorIgnoreList || [],
      },
      mutations: {
        dismissInsight: async (state: AdvisorState, insightId: string) => {
          state.ignoreList.push(insightId);
          UserSettings.items.advisorIgnoreList = state.ignoreList;
          UserSettings.commitItems();

          state.insights = await this.getInsights();
        },
        clearIgnoreList: async (state: AdvisorState) => {
          state.ignoreList = [];
          UserSettings.items.advisorIgnoreList = undefined;
          UserSettings.commitItems();

          state.insights = await this.getInsights();
        },
        updateInsight: async (state: AdvisorState) => {
          state.insights = await this.getInsights();
          state.ignoreList =
            typeof UserSettings.items.advisorIgnoreList === "string"
              ? JSON.parse(UserSettings.items.advisorIgnoreList || "[]")
              : UserSettings.items.advisorIgnoreList || [];
        },
      },
      namespaced: true,
    };
  }

  private async getInsights() {
    await UserSettings.updateItems();
    const advisorIgnoreList: string[] =
      typeof UserSettings.items.advisorIgnoreList === "string"
        ? JSON.parse(UserSettings.items.advisorIgnoreList || "[]")
        : UserSettings.items.advisorIgnoreList || [];

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
