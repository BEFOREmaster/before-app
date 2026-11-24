export interface RegretItem {
  level: "높음" | "주의";
  title: string;
  detail: string;
  tip: string;
}

export interface ConditionOption {
  value: string;
  label: string;
}

export interface ConditionGroup {
  key: string;
  label: string;
  options: ConditionOption[];
  warningMap: Record<string, { penalty: number; message: string }>;
}

export interface YoutubeItem {
  title: string;
  channel: string;
  thumbnail: string;
  summary: string;
  url: string;
}

export interface ReviewItem {
  sourceType: "naver" | "community" | "google";
  sourceLabel: string;
  sentiment: "장점" | "주의" | "장단점";
  summary: string;
  url: string;
}

export interface StoreItem {
  name: string;
  basePrice: number;
  supportsNaver: boolean;
  supportsCard: boolean;
  supportsPayback: boolean;
  note: string;
  url: string;
}

export interface BeforeReport {
  queryKey: string;
  cached: boolean;
  category: string;
  brand: string;
  productName: string;
  price: number;
  imageUrl: string;
  officialUrl: string;
  baseScore: number;
  conditions: ConditionGroup[];
  regrets: RegretItem[];
  pros: string[];
  alternatives: { name: string; price: string; reason: string }[];
  youtube: YoutubeItem[];
  reviews: ReviewItem[];
  stores: StoreItem[];
  analyzedAt: string;
}
