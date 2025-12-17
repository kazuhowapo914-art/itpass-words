export const MAJOR = {
  STRATEGY: "ストラテジ系",
  MANAGEMENT: "マネジメント系",
  TECHNOLOGY: "テクノロジ系",
} as const;

export const MINOR = {
  STRATEGY: {
    CORPORATE_ACTIVITY: "企業活動",
    LEGAL: "法務",
    BUSINESS_STRATEGY: "経営戦略マネジメント",
    TECH_STRATEGY: "技術戦略マネジメント",
    BUSINESS_INDUSTRY: "ビジネスインダストリ",
    SYSTEM_STRATEGY: "システム戦略",
    SYSTEM_PLANNING: "システム企画",
  },
  MANAGEMENT: {
    SYSTEM_DEV_TECH: "システム開発技術",
    SOFTWARE_DEV_MGMT: "ソフトウェア開発管理技術",
    PROJECT_MGMT: "プロジェクトマネジメント",
    SERVICE_MGMT: "サービスマネジメント",
    SYSTEM_AUDIT: "システム監査",
  },
  TECHNOLOGY: {
    BASIC_THEORY: "基礎理論",
    ALGO_PROGRAMMING: "アルゴリズムとプログラミング",
    COMPUTER_COMPONENTS: "コンピュータ構成要素",
    SYSTEM_COMPONENTS: "システム構成要素",
    SOFTWARE: "ソフトウェア",
    HARDWARE: "ハードウェア",
    INFO_DESIGN: "情報デザイン",
    INFO_MEDIA: "情報メディア",
    DATABASE: "データベース",
    NETWORK: "ネットワーク",
    SECURITY: "セキュリティ",
  },
} as const;

export type MajorKey = keyof typeof MAJOR;
export type MinorKey = string;

// ✅ 案2：categoryId（"TECHNOLOGY.SOFTWARE"）を主役にする
export type CategoryId = `${MajorKey}.${string}`;

export function splitCategoryId(id: string): { major: MajorKey; minor: string } | null {
  const [major, minor] = id.split(".");
  if (!major || !minor) return null;
  if (!(major in MAJOR)) return null;
  return { major: major as MajorKey, minor };
}

export function minorName(major: MajorKey, minor: string) {
  return (MINOR as Record<MajorKey, Record<string, string>>)[major]?.[minor] ?? minor;
}

export function categoryIdLabel(id: string) {
  const [majorRaw, minorRaw] = id.split(".");
  if (!majorRaw || !minorRaw) return id;
  if (!(majorRaw in MAJOR)) return id;

  const major = majorRaw as MajorKey;
  return `${MAJOR[major]} / ${minorName(major, minorRaw)}`;
}