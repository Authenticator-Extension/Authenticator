interface AdvisorInsightInterface {
  id: string;
  level: string;
  description: string;
  link?: string;
  validation: () => Promise<boolean>; // true if the insight should be shown
}
