// src/lib/selectPreset.ts

export type Level = 0 | 1 | 2 | 3 | 4;
export type OrderMode = "seq" | "random";
export type LearnMode = "study" | "quiz";

export type SelectPreset = {
  categoryIds: string[]; // ["TECHNOLOGY.SOFTWARE", ...] 空なら全範囲
  levels: Level[];       // 空なら全レベル（OR）
  order: OrderMode;
  mode: LearnMode;
};

export const DEFAULT_PRESET: SelectPreset = {
  categoryIds: [],
  levels: [],
  order: "seq",
  mode: "study",
};

// 今日のおすすめ：わからない(1)＋覚えかけ(2)、ランダム、クイズ
export const TODAY_RECOMMEND: Partial<SelectPreset> = {
  levels: [1, 2],
  order: "random",
  mode: "quiz",
};
