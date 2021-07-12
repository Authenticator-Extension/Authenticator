export enum InsightLevel {
  danger = "danger",
  warning = "warning",
  info = "info",
}

export class AdvisorInsight implements AdvisorInsightInterface {
  id: string;
  level: string;
  levelText: string;
  description: string;
  link: string | undefined;
  validation: () => Promise<boolean>;

  constructor(insight: AdvisorInsightInterface) {
    this.id = insight.id;
    this.level = insight.level as InsightLevel;
    this.levelText = chrome.i18n.getMessage(insight.level);
    this.description = insight.description;
    this.link = insight.link;
    this.validation = insight.validation;
  }
}
