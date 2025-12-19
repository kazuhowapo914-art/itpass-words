import type { SelectPreset, Level } from "./selectPreset";
import { DEFAULT_PRESET } from "./selectPreset";

// src/lib/engine.ts

import type { Word } from "@/types/word";
import type { Progress } from "@/lib/storage";
import { getLevel } from "@/lib/storage";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ これを全画面で使う
export function buildPool(words: Word[], preset: SelectPreset, progress: Progress): Word[] {
  const byCategory =
    preset.categoryIds.length === 0
      ? words
      : words.filter((w) => preset.categoryIds.includes(w.categoryId));

  // 仕様：カテゴリ選択がある時だけ levels 有効
  const useLevelFilter = preset.categoryIds.length > 0 && preset.levels.length > 0;

  const byLevel = useLevelFilter
    ? byCategory
    : byCategory.filter((w) => preset.levels.includes(getLevel(progress, w.id) as Level));

  const base = [...byLevel].sort((a, b) => a.id - b.id);
  return preset.order === "seq" ? base : shuffle(base);
}


function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function presetToQuery(p: SelectPreset): string {
  const params = new URLSearchParams();

  if (p.categoryIds.length) params.set("cats", p.categoryIds.slice().sort().join(","));
  if (p.levels.length) params.set("lv", p.levels.slice().sort((a, b) => a - b).join(","));
  params.set("mode", p.mode);
  params.set("order", p.order);

  const s = params.toString();
  return s ? `?${s}` : "";
}

export function queryToPreset(q: URLSearchParams): SelectPreset {
  const cats = (q.get("cats") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const lvRaw = (q.get("lv") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => [0, 1, 2, 3, 4].includes(n)) as Level[];

  const mode = q.get("mode");
  const order = q.get("order");

  return {
    categoryIds: uniq(cats),
    levels: uniq(lvRaw),
    mode: mode === "quiz" ? "quiz" : "study",
    order: order === "random" ? "random" : "seq",
  };
}

// URL優先、なければlocalStorage、無ければデフォ
export function mergePreset(urlPreset: SelectPreset | null, savedPreset: SelectPreset | null): SelectPreset {
  if (urlPreset) return urlPreset;
  if (savedPreset) return savedPreset;
  return DEFAULT_PRESET;
}
