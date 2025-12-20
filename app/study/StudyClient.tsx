"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Word } from "@/types/word";
import { fetchWords } from "@/lib/words";

import { loadProgress, saveProgress, getLevel, setLevel, loadPreset } from "@/lib/storage";
import type { Level, SelectPreset } from "@/lib/selectPreset";

import { categoryIdLabel } from "@/constants/categories";
import { Header } from "@/components/Header";

import styles from "./page.module.css";

import { buildPool } from "@/lib/engine";

// -------- URL -> preset（study用）--------
function presetFromUrl(params: URLSearchParams): SelectPreset | null {
  const cats = (params.get("cats") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

    const rawLv = params.get("lv"); // ← null の可能性あり

  const lv: Level[] = rawLv
    ? rawLv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) // ← "" を落とす（これが超重要）
        .map((s) => Number(s))
        .filter((n): n is Level => n === 0 || n === 1 || n === 2 || n === 3 || n === 4)
    : [];

  const orderRaw = params.get("order");
  const order = orderRaw === "random" ? "random" : orderRaw === "seq" ? "seq" : null;
  if (!order) return null;

  return {
    categoryIds: cats,
    levels: lv,
    order,
    mode: "study",
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// function applyFilters(words: Word[], preset: SelectPreset, progress: Record<number, Level>) {
//   const byCategory =
//     preset.categoryIds.length === 0 ? words : words.filter((w) => preset.categoryIds.includes(w.categoryId));

//   // 仕様：levelsフィルタはカテゴリ選択がある時だけ有効
//   const useLevelFilter = preset.categoryIds.length > 0 && preset.levels.length >= 0;
//   const byLevel = !useLevelFilter ? byCategory : byCategory.filter((w) => preset.levels.includes(getLevel(progress, w.id)));

//   const base = [...byLevel].sort((a, b) => a.id - b.id);
//   return preset.order === "seq" ? base : shuffle(base);
// }

const LEVEL_LABEL: Record<Level, string> = {
  0: "未学習",
  1: "わからない",
  2: "覚えかけ",
  3: "覚えた",
  4: "完璧",
};

const LEVEL_TONE: Record<Level, "neutral" | "bad" | "mid" | "good" | "perfect"> = {
  0: "neutral",
  1: "bad",
  2: "mid",
  3: "good",
  4: "perfect",
};



type Phase = "study" | "between";

export default function StudyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<number, Level>>({});
  const [preset, setPreset] = useState<SelectPreset | null>(null);

  const [pool, setPool] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [loop, setLoop] = useState(1);

  const [phase, setPhase] = useState<Phase>("study");
  const [showMeaning, setShowMeaning] = useState(false);

  const [transition, setTransition] = useState<"none" | "next" | "prev">("none");
  const [toast, setToast] = useState<string | null>(null);

  const TRANS_MS = 180;
 
const presetKey = useMemo(() => {
  if (!preset) return "";
  return [
    (preset.categoryIds ?? []).join(","),
    (preset.levels ?? []).join(","),
    preset.order,
  ].join("|");
}, [preset]);



  useEffect(() => {
    setProgress(loadProgress());

    fetchWords()
      .then(setWords)
      .catch((e) => {
        console.error(e);
        setWords([]);
      });

    const urlHasAny = searchParams.toString().length > 0;
    const fromUrl = urlHasAny ? presetFromUrl(searchParams) : null;
    const saved = loadPreset();

    const merged =
      fromUrl ??
      saved ?? {
        categoryIds: [],
        levels: [],
        order: "seq",
        mode: "study",
      };

    setPreset(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 // ✅ pool生成は「words + preset」が揃ったら一回だけ
  useEffect(() => {
  if (!words.length || !preset) return;

  const nextPool = buildPool(words, preset, progress);

  setPool(nextPool);
  setIdx(0);
  setLoop(1);
  setPhase("study");
  setShowMeaning(false);
  setTransition("none");
  setToast(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [words.length, presetKey]);

  const current = pool[idx];

  const headerRight = useMemo(() => {
    const total = pool.length;
    const pos = total ? idx + 1 : 0;
    return total ? `${loop}周目 : ${pos}/${total}` : `${loop}周目`;
  }, [idx, loop, pool.length]);

  function goHome() {
    router.push("/");
  }

  function goSelect() {
    router.push("/select");
  }

  function animateTo(direction: "next" | "prev", after: () => void) {
    setTransition(direction);
    window.setTimeout(() => {
  after();
  setShowMeaning(false);

  // ✅ 次の単語は先頭から見せる
  window.scrollTo({ top: 0, left: 0 });

  setTransition("none");
}, TRANS_MS);
  }

  function prevWord() {
    if (!pool.length || transition !== "none") return;
    setToast(null);
    animateTo("prev", () => setIdx((p) => (p - 1 + pool.length) % pool.length));
  }

  function nextOrBetween() {
    if (!pool.length) return;

    // ✅ 1周の最後なら「between画面」へ
    if (idx === pool.length - 1) {
      setPhase("between");
      setToast(null);
      setShowMeaning(false);
      return;
    }

    setIdx((p) => p + 1);
  }

  function rate(level: Level) {
    if (!current || transition !== "none") return;

    const next = setLevel(progress, current.id, level);
    setProgress(next);
    saveProgress(next);

    setToast(`記録：${LEVEL_LABEL[level]} → 次へ`);
    window.setTimeout(() => setToast(null), 900);

    animateTo("next", () => nextOrBetween());
  }

  function skip() {
    if (!current || transition !== "none") return;

    setToast("スキップ → 次へ");
    window.setTimeout(() => setToast(null), 700);

    animateTo("next", () => nextOrBetween());
  }

  // ✅ between画面：「x周目へ」
  function startNextLoop() {
    const nextLoop = loop + 1;

    setLoop(nextLoop);
    setIdx(0);
    setPhase("study");
    setShowMeaning(false);

    // ランダムなら次周開始時に再シャッフル
    if (preset?.order === "random") {
      setPool((p) => shuffle(p));
    }
  }

  // ✅ between画面：「この範囲でテスト」→ /quizへ（同じ条件をURLで渡す）
  function startQuizFromSelection() {
    const cats = preset?.categoryIds?.length ? preset.categoryIds.join(",") : "";
    const lv = preset?.categoryIds?.length && preset.levels?.length ? preset.levels.join(",") : "";
    const order = preset?.order ?? "seq";

    const params = new URLSearchParams();
    if (cats) params.set("cats", cats);
    if (lv) params.set("lv", lv);
    params.set("order", order);
    params.set("mode", "quiz");

    router.push(`/quiz?${params.toString()}`);
  }


  if (!pool.length) {
    return (
      <>
        <Header title="単語帳" right={headerRight} />
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.emptyTitle}>出題できる単語が無かった…</div>
            <div className={styles.emptyHint}>条件をゆるめてください。</div>

            <div className={styles.emptyActions}>
              <button className={styles.btnGhost} onClick={goSelect}>
                条件を変える
              </button>
              <button className={styles.btnGhost} onClick={goHome}>
                ホームへ
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ✅ ③ between画面
  if (phase === "between") {
    const nextLoop = loop + 1;
    return (
      <>
        <Header title="単語帳" right={`${loop}周目 完了`} />

        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.betweenTitle}>おつかれ！{loop}周目おわり🐶</div>
            <div className={styles.betweenHint}>
              次の周に進むか、今の範囲でテスト（4択）するか選ぶ
            </div>

            <div className={styles.betweenActions}>
              <button className={styles.btnPrimary} onClick={startNextLoop}>
                {nextLoop}周目へ →
              </button>

              <button className={styles.btnGood} onClick={startQuizFromSelection}>
                選択した出題範囲でテスト（4択） →
              </button>
            </div>

            <div className={styles.betweenSub}>
              <button className={styles.btnGhost} onClick={goSelect}>
                条件を変える
              </button>
              <button className={styles.btnGhost} onClick={goHome}>
                ホームへ
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // study表示
  const lvNow = current ? getLevel(progress, current.id) : 0;
  const tone = LEVEL_TONE[lvNow];

  return (
    <>
      <Header title="単語帳" right={headerRight} />

      <main className={styles.main}>
        <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`} aria-live="polite">
          {toast ?? ""}
        </div>

        <section
          className={`${styles.card} ${styles[`tone_${tone}`]} ${
            transition === "next" ? styles.slideNext : transition === "prev" ? styles.slidePrev : ""
          }`}
        >
          <div className={styles.metaRow}>
            <div className={styles.category}>{categoryIdLabel(current.categoryId)}</div>
            <div className={`${styles.levelPill} ${styles[`pill_${tone}`]}`}>
              定着度：{LEVEL_LABEL[lvNow]}
            </div>
          </div>

          <h2 className={styles.term}>{current.term}</h2>

          <div className={styles.meaningBox}>
            <div className={styles.meaningHeader}>
              <span className={styles.meaningTitle}>意味</span>
              <button
                className={styles.btnTiny}
                onClick={() => setShowMeaning((v) => !v)}
                disabled={transition !== "none"}
              >
                {showMeaning ? "隠す" : "見る"}
              </button>
            </div>

            {showMeaning ? (
              <div className={styles.meaning}>{current.meaning}</div>
            ) : (
              <div className={styles.meaningHidden}>（頭の中で答えてから “見る” 推奨）</div>
            )}
          </div>

        {current.detail && (
  <details key={current.id} className={styles.details}>
    <summary>詳細解説</summary>
    <div className={styles.detail}>{current.detail}</div>
  </details>
)}

        </section>

        <footer className={styles.bottomBar}>
          <div className={styles.bottomTopRow}>
            <button className={styles.btnBack} onClick={prevWord} disabled={transition !== "none"}>
              ← 前へ
            </button>
            <div className={styles.hintText}>評価を押すと記録して次の単語へ進む</div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnBad} onClick={() => rate(1)} disabled={transition !== "none"}>
              わからない →
            </button>
            <button className={styles.btnMid} onClick={() => rate(2)} disabled={transition !== "none"}>
              覚えかけ →
            </button>
            <button className={styles.btnGood} onClick={() => rate(3)} disabled={transition !== "none"}>
              覚えた →
            </button>
            <button className={styles.btnSkip} onClick={skip} disabled={transition !== "none"}>
              スキップ →
            </button>
          </div>

          <div className={styles.navRow}>
            <button className={styles.btnGhost} onClick={goSelect}>
              条件選択へ
            </button>
            <button className={styles.btnGhost} onClick={goHome}>
              ホームへ
            </button>
          </div>
        </footer>
      </main>
    </>
  );
}
