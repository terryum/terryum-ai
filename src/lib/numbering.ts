export const formatPostNumber = (n: number): string => `#${n}`;
export const formatSurveyNumber = (n: number): string => `#S${n}`;
export const formatTutorialNumber = (n: number): string => `#T${n}`;
export const formatSurveyLabel = (item: { survey_number?: number | null; tutorial_number?: number; content_type?: string }): string =>
  item.content_type === 'tutorial' && item.tutorial_number != null
    ? formatTutorialNumber(item.tutorial_number)
    : formatSurveyNumber(item.survey_number ?? 0);
export const formatProjectNumber = (n: number): string => `#P${n}`;
