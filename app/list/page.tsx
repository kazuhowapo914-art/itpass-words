"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Word } from "@/types/word";
import { fetchWords } from "@/lib/words";
import { MAJOR, MINOR, categoryIdLabel, minorName, type MajorKey, type CategoryId } from "@/constants/categories";

function normalize(s: string) {
  return s.toLowerCase();
}

function wordMatchesQuery(w: Word, q: string) {
  if (!q) return true;

  const hay = [
    w.term,
    w.meaning,
    w.detail ?? "",
    (w.tags ?? []).join(" "),
    categoryIdLabel(w.categoryId),
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

export default function ListPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [query, setQuery] = useState("");

  // ✅ 案2：選択状態は categoryId をそのまま持つ
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<CategoryId>>(new Set());

  useEffect(() => {
    fetchWords().then(setWords).catch(console.error);
  }, []);

  const majorKeys = useMemo(() => Object.keys(MAJOR) as MajorKey[], []);
  const minorKeysByMajor = useMemo(() => {
    const out: Record<MajorKey, string[]> = {} as any;
    for (const m of majorKeys) out[m] = Object.keys(MINOR[m]);
    return out;
  }, [majorKeys]);

  function makeCategoryId(major: MajorKey, minor: string): CategoryId {
    return `${major}.${minor}` as CategoryId;
  }

  function isMinorChecked(major: MajorKey, minor: string) {
    return selectedCategoryIds.has(makeCategoryId(major, minor));
  }

  function toggleMinor(major: MajorKey, minor: string) {
    const id = makeCategoryId(major, minor);
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function majorAllMinorsSelected(major: MajorKey) {
    const minors = minorKeysByMajor[major];
    if (!minors.length) return false;
    return minors.every((mn) => selectedCategoryIds.has(makeCategoryId(major, mn)));
  }

  function majorSomeMinorsSelected(major: MajorKey) {
    const minors = minorKeysByMajor[major];
    return minors.some((mn) => selectedCategoryIds.has(makeCategoryId(major, mn)));
  }

  function toggleMajor(major: MajorKey) {
    const minors = minorKeysByMajor[major];

    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      const allSelected = minors.every((mn) => next.has(makeCategoryId(major, mn)));

      for (const mn of minors) {
        const id = makeCategoryId(major, mn);
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setSelectedCategoryIds(new Set());
  }

  const filtered = useMemo(() => {
    const q = normalize(query.trim());

    return words.filter((w) => {
      if (!wordMatchesQuery(w, q)) return false;

      // ✅ カテゴリ絞り込み：選択があれば categoryId で一致
      if (selectedCategoryIds.size > 0) {
        if (!selectedCategoryIds.has(w.categoryId as CategoryId)) return false;
      }
      return true;
    });
  }, [words, query, selectedCategoryIds]);

  const stats = useMemo(() => {
    // ✅ minorごとの件数（表示用）
    const counts: Record<string, number> = {};
    for (const w of filtered) {
      const key = w.categoryId;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  if (!words.length) {
    return <main style={{ padding: 24 }}>読み込み中…</main>;
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>単語一覧</h1>

      {/* 検索 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（用語 / 意味 / 詳細 / タグ）"
          style={{
            flex: "1 1 320px",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 10,
          }}
        />
        <button onClick={clearFilters}>条件クリア</button>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          {filtered.length} / {words.length} 件
        </div>
      </div>

      {/* フィルタ */}
      <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>カテゴリ</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {majorKeys.map((mj) => {
            const all = majorAllMinorsSelected(mj);
            const some = majorSomeMinorsSelected(mj);

            return (
              <div key={mj} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = !all && some;
                    }}
                    onChange={() => toggleMajor(mj)}
                  />
                  {MAJOR[mj]}
                </label>

                <div style={{ marginTop: 8, paddingLeft: 8, display: "grid", gap: 6 }}>
                  {minorKeysByMajor[mj].map((mn) => {
                    const id = makeCategoryId(mj, mn);
                    const count = stats[id] ?? 0;

                    return (
                      <label key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={isMinorChecked(mj, mn)} onChange={() => toggleMinor(mj, mn)} />
                        <span style={{ flex: 1 }}>
                          {minorName(mj, mn)}
                          <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.65 }}>({count})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          ※ 下位カテゴリを選ぶと、そのカテゴリだけに絞り込みます（未選択なら全件）
        </div>
      </section>

      {/* 一覧 */}
      <section style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((w) => (
            <div key={w.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{w.term}</div>

                  <Link
                    href={`/study?id=${w.id}`}
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 12,
                      padding: "4px 10px",
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      textDecoration: "none",
                      opacity: 0.8,
                    }}
                  >
                    この単語から学習 →
                  </Link>
                </div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>{categoryIdLabel(w.categoryId)}</div>
              </div>

              <div style={{ marginTop: 6, lineHeight: 1.7 }}>{w.meaning}</div>

              {(w.tags?.length ?? 0) > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {w.tags!.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        border: "1px solid #eee",
                        borderRadius: 999,
                        opacity: 0.85,
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {w.detail && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer" }}>詳細解説</summary>
                  <p style={{ lineHeight: 1.7, marginTop: 8 }}>{w.detail}</p>
                </details>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ marginTop: 16, padding: 12, opacity: 0.7 }}>条件に合う単語が見つからへんかった…</div>
        )}
      </section>
    </main>
  );
}
