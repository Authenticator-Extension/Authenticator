import { EntryStorage } from "../models/storage";
import { InsightLevel, AdvisorInsight } from "../models/advisor";

const insightsData: AdvisorInsightInterface[] = [
  {
    id: "passwordNotSet",
    level: InsightLevel.danger,
    description: chrome.i18n.getMessage("advisor_insight_password_not_set"),
    validation: async () => {
      const hasEncryptedEntry = await EntryStorage.hasEncryptedEntry();
      return !hasEncryptedEntry;
    },
  },
  {
    id: "autoLockNotSet",
    level: InsightLevel.warning,
    description: chrome.i18n.getMessage("advisor_insight_auto_lock_not_set"),
    validation: async () => {
      const hasEncryptedEntry = await EntryStorage.hasEncryptedEntry();
      return hasEncryptedEntry && !Number(localStorage.autolock);
    },
  },
  {
    id: "browserSyncNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_browser_sync_not_enabled"
    ),
    validation: async () => {
      const storageArea = localStorage.storageLocation;
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
      return localStorage.autofill !== "true";
    },
  },
  {
    id: "smartFilterNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_smart_filter_not_enabled"
    ),
    validation: async () => {
      return localStorage.smartFilter === "false";
    },
  },
];

export class Advisor implements Module {
  async getModule() {
    return {
      state: {
        insights: await this.getInsights(),
        ignoreList: JSON.parse(localStorage.advisorIgnoreList || "[]"),
      },
      mutations: {
        dismissInsight: async (state: AdvisorState, insightId: string) => {
          state.ignoreList.push(insightId);
          localStorage.advisorIgnoreList = JSON.stringify(state.ignoreList);

          state.insights = await this.getInsights();
        },
        clearIgnoreList: async (state: AdvisorState) => {
          state.ignoreList = [];
          localStorage.removeItem("advisorIgnoreList");

          state.insights = await this.getInsights();
        },
        updateInsight: async (state: AdvisorState) => {
          state.insights = await this.getInsights();
          state.ignoreList = JSON.parse(localStorage.advisorIgnoreList || "[]");
        },
      },
      namespaced: true,
    };
  }

  private async getInsights() {
    const advisorIgnoreList: string[] = JSON.parse(
      localStorage.advisorIgnoreList || "[]"
    );

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
