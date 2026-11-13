export interface GuideTopic {
  label: string;
  answer: string;
  keywords?: string[];
  hidden?: boolean;
  action?: () => void;
}
export function findGuideTopic(question: string, topics: GuideTopic[]): GuideTopic | undefined {
  const text = question.toLocaleLowerCase().replace(/[?!.,]/g, "").trim();
  if (!text) return undefined;
  return topics.find(topic => topic.label.toLocaleLowerCase() === text) ??
    topics.find(topic => topic.keywords?.some(keyword => text.includes(keyword.toLocaleLowerCase())));
}
