import type { SelectPreset, Level } from "./selectPreset";
import { DEFAULT_PRESET } from "./selectPreset";

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
