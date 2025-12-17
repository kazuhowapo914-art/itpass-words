"use client";

import { useEffect, useMemo, useState } from "react";
import type { Word } from "@/types/word";
import { fetchWords } from "@/lib/words";
import { loadProgress, saveProgress, type Progress } from "@/lib/storage";

export default function ReviewPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState<Progress>({});
  const [showMeaning, setShowMeaning] = useState(true);

  useEffect(() => {
    setProgress(loadProgress());
    fetchWords().then(setWords).catch(console.error);
  }, []);

  const reviewWords = useMemo(() => {
    // unknown だけ（「未評価」はここでは復習対象にしない）
    return words.filter((w) => progress[w.id] === "unknown");
  }, [words, progress]);

  const current = reviewWords[idx];

  const stats = useMemo(() => {
    const total = words.length;
    const known = Object.values(progress).filter((v) => v === "known").length;
    const unknown = Object.values(progress).filter((v) => v === "unknown").length;
    return { total, known, unknown, review: reviewWords.length };
  }, [words.length, progress, reviewWords.length]);

  function mark(status: "known" | "unknown") {
    if (!current) return;
    const next = { ...progress, [current.id]: status };
    setProgress(next);
    saveProgress(next);
    nextWord();
  }

  function nextWord() {
    setShowMeaning(true);
    setIdx((p) => (reviewWords.length ? (p + 1) % reviewWords.length : 0));
  }

  // 復習対象が減って idx が範囲外になった時の保険
  useEffect(() => {
    if (idx >= reviewWords.length) setIdx(0);
  }, [idx, reviewWords.length]);

  if (!words.length) {
    return <main style={{ padding: 24 }}>読み込み中…</main>;
  }

  if (!reviewWords.length) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
        <h1>復習</h1>
        <p>「まだ」の単語がないで！えらい👏</p>
        <p style={{ opacity: 0.8 }}>学習で「まだ」を付けたら、ここに出てくるようになる。</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>復習（まだだけ）</h1>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          復習{stats.review} / 全{stats.total}（覚えた{stats.known}・まだ{stats.unknown}）
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{String(current.categoryId) ?? "カテゴリ未設定"}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {idx + 1} / {reviewWords.length}
          </div>
        </div>

        <h2 style={{ marginTop: 8 }}>{current.term}</h2>

        {showMeaning ? (
          <p style={{ lineHeight: 1.7 }}>{current.meaning}</p>
        ) : (
          <p style={{ lineHeight: 1.7, opacity: 0.6 }}>（答えは頭の中で…！）</p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={() => setShowMeaning((v) => !v)}>
            {showMeaning ? "意味を隠す" : "意味を見る"}
          </button>
          <button onClick={() => mark("known")}>覚えた（卒業）</button>
          <button onClick={() => mark("unknown")}>まだ</button>
          <button onClick={nextWord}>スキップ</button>
        </div>
      </div>
    </main>
  );
}
