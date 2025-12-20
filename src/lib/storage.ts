// src/lib/storage.ts
// localStorage 永続化：progress / select preset / quiz correct total / resetAll

// --------------------
// Types
// --------------------
import type { Level, OrderMode,LearnMode,SelectPreset } from "./selectPreset";

export type Progress = Record<number, Level>;

// --------------------
// localStorage Keys
// --------------------
const KEY_PROGRESS = "progress_v1";
const KEY_PRESET = "select_preset_v1";
const KEY_QUIZ_CORRECT_TOTAL = "quiz_correct_total_v1";

const ALL_KEYS = [
  KEY_PROGRESS,
  KEY_PRESET,
  KEY_QUIZ_CORRECT_TOTAL,
] as const;

// --------------------
// guards / helpers
// --------------------
function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isLevel(x: unknown): x is Level {
  return x === 0 || x === 1 || x === 2 || x === 3 || x === 4;
}

function clampLevel(n: number): Level {
  if (n <= 0) return 0;
  if (n >= 4) return 4;
  return n as Level;
}

function isOrderMode(x: unknown): x is OrderMode {
  return x === "seq" || x === "random";
}

function isLearnMode(x: unknown): x is LearnMode {
  return x === "study" || x === "quiz";
}

// --------------------
// Progress
// --------------------
export function loadProgress(): Progress {
  if (!canUseLocalStorage()) return {};
  const obj = safeParseJson<Record<string, unknown>>(localStorage.getItem(KEY_PROGRESS));
  if (!obj || typeof obj !== "object") return {};

  const out: Progress = {};
  for (const [k, v] of Object.entries(obj)) {
    const id = Number(k);
    if (!Number.isFinite(id)) continue;
     // ✅ 1) numberならそのまま
  if (isLevel(v)) {
    out[id] = v;
    continue;
  }

  // ✅ 2) "1" みたいな文字列数値も Level に変換
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && isLevel(n)) {
      out[id] = n;
    }
  }
  }
  return out;
}

export function saveProgress(progress: Progress) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
}

/** progressが無い場合は 0（未学習） */
export function getLevel(progress: Progress, wordId: number): Level {
  return progress[wordId] ?? 0;
}

/** levelを上書き（0..4に正規化） */
export function setLevel(progress: Progress, wordId: number, level: Level): Progress {
  return { ...progress, [wordId]: clampLevel(level) };
}

/** 正解：1段階UP（最大4） */
export function levelUp(level: Level): Level {
  return clampLevel(level + 1);
}

/** 不正解：1段階DOWN（最低1） */
export function levelDownMin1(level: Level): Level {
  // 0が来ても最低1（わからない）まで
  const next = level - 1;
  return next <= 1 ? 1 : (next as Level);
}

// --------------------
// Select Preset（前回条件）
// --------------------
function normalizePreset(raw: any): SelectPreset | null {
  if (!raw || typeof raw !== "object") return null;

  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.filter((s: unknown) => typeof s === "string").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const levels = Array.isArray(raw.levels)
    ? raw.levels.filter(isLevel)
    : [];

  const order = isOrderMode(raw.order) ? raw.order : null;
  const mode = isLearnMode(raw.mode) ? raw.mode : null;

  if (!order || !mode) return null;

  return {
    categoryIds,
    levels,
    order,
    mode,
  };
}

export function loadPreset(): SelectPreset | null {
  if (!canUseLocalStorage()) return null;
  const raw = safeParseJson<any>(localStorage.getItem(KEY_PRESET));
  return normalizePreset(raw);
}

export function savePreset(preset: SelectPreset) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(KEY_PRESET, JSON.stringify(preset));
}

// --------------------
// Quiz Correct Total（トロフィー用）
// --------------------
export function loadQuizCorrectTotal(): number {
  if (!canUseLocalStorage()) return 0;
  const raw = localStorage.getItem(KEY_QUIZ_CORRECT_TOTAL);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function saveQuizCorrectTotal(total: number) {
  if (!canUseLocalStorage()) return;
  const n = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
  localStorage.setItem(KEY_QUIZ_CORRECT_TOTAL, String(n));
}

export function addQuizCorrect(delta = 1): number {
  const cur = loadQuizCorrectTotal();
  const next = cur + Math.max(0, Math.floor(delta));
  saveQuizCorrectTotal(next);
  return next;
}

/** トロフィー数：10問正解ごとに1、最大20個（UIで20+） */
export function calcTrophyCount(totalCorrect: number): number {
  return Math.min(20, Math.floor(Math.max(0, totalCorrect) / 10));
}

// --------------------
// Reset
// --------------------
export function resetAll() {
  if (!canUseLocalStorage()) return;
  for (const key of ALL_KEYS) {
    localStorage.removeItem(key);
  }
}
