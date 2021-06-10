export enum InsightLevel {
  critical = "critical",
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
    switch (insight.level as InsightLevel) {
      case InsightLevel.critical:
        this.levelText = chrome.i18n.getMessage("critical");
        break;
      case InsightLevel.warning:
        this.levelText = chrome.i18n.getMessage("warning");
        break;
      case InsightLevel.info:
        this.levelText = chrome.i18n.getMessage("info");
        break;
    }

    this.id = insight.id;
    this.level = insight.level as InsightLevel;
    this.description = insight.description;
    this.link = insight.link;
    this.validation = insight.validation;
  }
}
