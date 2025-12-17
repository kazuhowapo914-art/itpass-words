// src/lib/words.ts
// words.json の読み込み + バリデーション（meaning重複しない前提を担保）

import type { Word } from "@/types/word";

// ---- fetch ----
export async function fetchWords(): Promise<Word[]> {
  const res = await fetch("/words.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load words.json");
  const data = (await res.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new Error("words.json must be an array");
  }

  validateWords(data);
  return data as Word[];
}

// ---- validation ----
function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function normalizeMeaning(s: string): string {
  // 重複検出用：余分な空白を潰して小文字化
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateWords(words: unknown[]) {
  const seenId = new Set<number>();
  const seenMeaning = new Map<string, number>(); // normalized meaning -> id
  const seenTerm = new Map<string, number>(); // optional: term重複検知用（警告したいなら使う）

  for (let i = 0; i < words.length; i++) {
    const w: any = words[i];

    // shape check
    if (typeof w !== "object" || w === null) {
      throw new Error(`word must be object: index=${i}`);
    }

    // id
    const id = w.id;
    if (typeof id !== "number" || !Number.isFinite(id)) {
      throw new Error(`invalid id: index=${i}`);
    }
    if (seenId.has(id)) {
      throw new Error(`duplicate id: id=${id}`);
    }
    seenId.add(id);

    // term / meaning / categoryId
    if (!isNonEmptyString(w.term)) {
      throw new Error(`term missing: id=${id}`);
    }
    if (!isNonEmptyString(w.meaning)) {
      throw new Error(`meaning missing: id=${id}`);
    }
    if (!isNonEmptyString(w.categoryId)) {
      throw new Error(`categoryId missing: id=${id}`);
    }

    // meaning uniqueness (仕様：meaningは重複しない)
    const mNorm = normalizeMeaning(w.meaning);
    const prevId = seenMeaning.get(mNorm);
    if (prevId !== undefined) {
      throw new Error(
        `duplicate meaning detected: id=${id} duplicates id=${prevId} (meaning="${w.meaning}")`
      );
    }
    seenMeaning.set(mNorm, id);

    // tags (optional)
    if (w.tags !== undefined) {
      if (!Array.isArray(w.tags)) throw new Error(`tags must be array: id=${id}`);
      for (const t of w.tags) {
        if (!isNonEmptyString(t)) throw new Error(`tag must be non-empty string: id=${id}`);
      }
    }

    // detail (optional)
    if (w.detail !== undefined && typeof w.detail !== "string") {
      throw new Error(`detail must be string if present: id=${id}`);
    }

    // optional: term duplication warning (エラーにしたくないならコメントアウトでもOK)
    const termNorm = w.term.trim().toLowerCase();
    const prevTermId = seenTerm.get(termNorm);
    if (prevTermId !== undefined) {
      // term重複は仕様で禁止してないのでエラーにしない（必要ならthrowに変更）
      console.warn(`duplicate term: "${w.term}" (id=${id} duplicates id=${prevTermId})`);
    } else {
      seenTerm.set(termNorm, id);
    }

    // categoryId format check: "MAJOR.MINOR"
    // 厳密に MAJOR/MINOR 定数と突き合わせるのは categories.ts 側のvalidate関数に分けてもOK
    const parts = String(w.categoryId).split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`invalid categoryId format (must be MAJOR.MINOR): id=${id} categoryId=${w.categoryId}`);
    }
  }
}
