import { ActionContext } from "vuex";
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

export class Advisor implements Module {
  async getModule() {
    await UserSettings.updateItems();
    return {
      state: {
        insights: await this.getInsights(),
        ignoreList: UserSettings.items.advisorIgnoreList || [],
      },
      mutations: {
        // sync state changes only (these used to be async mutations that
        // assigned state after an await, which Vuex strict mode forbids)
        pushIgnore(state: AdvisorState, insightId: string) {
          state.ignoreList.push(insightId);
        },
        setIgnoreList(state: AdvisorState, list: string[]) {
          state.ignoreList = list;
        },
        setInsights(state: AdvisorState, insights: AdvisorInsightInterface[]) {
          state.insights = insights;
        },
      },
      actions: {
        dismissInsight: async (
          context: ActionContext<AdvisorState, object>,
          insightId: string,
        ) => {
          context.commit("pushIgnore", insightId);
          UserSettings.items.advisorIgnoreList = context.state.ignoreList;
          await UserSettings.commitItems();

          context.commit("setInsights", await this.getInsights());
        },
        clearIgnoreList: async (
          context: ActionContext<AdvisorState, object>,
        ) => {
          context.commit("setIgnoreList", []);
          UserSettings.items.advisorIgnoreList = undefined;
          await UserSettings.commitItems();

          context.commit("setInsights", await this.getInsights());
        },
        updateInsight: async (context: ActionContext<AdvisorState, object>) => {
          context.commit("setInsights", await this.getInsights());
          context.commit("setIgnoreList", parseIgnoreList());
        },
      },
      namespaced: true,
    };
  }

  private async getInsights() {
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
}
