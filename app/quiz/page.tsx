"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Word } from "@/types/word";
import { fetchWords } from "@/lib/words";

import {
  loadProgress,
  saveProgress,
  getLevel,
  setLevel,
  levelUp,
  levelDownMin1,
  loadPreset,
  loadQuizCorrectTotal,
  addQuizCorrect,
  calcTrophyCount,
} from "@/lib/storage";

import type { Level, SelectPreset } from "@/lib/selectPreset";
import { categoryIdLabel } from "@/constants/categories";
import { Header } from "@/components/Header";

import styles from "./page.module.css";

// -------- URL -> preset（quiz用）--------
function presetFromUrl(params: URLSearchParams): SelectPreset | null {
  const cats = (params.get("cats") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // lv未指定なら []（""→0 を防ぐ）
  const rawLv = params.get("lv");
  const lv: Level[] = rawLv
    ? rawLv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
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
    mode: "quiz",
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

function applyFilters(words: Word[], preset: SelectPreset, progress: Record<number, Level>) {
  const byCategory =
    preset.categoryIds.length === 0 ? words : words.filter((w) => preset.categoryIds.includes(w.categoryId));

  // 仕様：levelsフィルタはカテゴリ選択がある時だけ有効
  const useLevelFilter = preset.categoryIds.length > 0 && preset.levels.length > 0;
  const byLevel = !useLevelFilter
    ? byCategory
    : byCategory.filter((w) => preset.levels.includes(getLevel(progress, w.id)));

  const base = [...byLevel].sort((a, b) => a.id - b.id);
  return preset.order === "seq" ? base : shuffle(base);
}

// --- 定着度ラベル
const LEVEL_LABEL: Record<Level, string> = {
  0: "未学習",
  1: "わからない",
  2: "覚えかけ",
  3: "もうちょい",
  4: "完璧",
};

type Phase = "quiz" | "result";

// 正答率コメント（セッション固定）
function pickCommentBucket(accuracy: number) {
  if (accuracy >= 0.8) return 4;
  if (accuracy >= 0.6) return 3;
  if (accuracy >= 0.4) return 2;
  if (accuracy >= 0.2) return 1;
  return 0;
}

const COMMENTS: Record<number, string[]> = {
  0: ["だいじょぶ、最初はみんな0点からやで。次いこ次いこ！", "目つぶってたん？…うそ。ここから伸びるやつ！"],
  1: ["ええやん、伸びしろしかないわ。", "ちょいずつ当たりだしてる！この調子！"],
  2: ["半分見えてきたで。ここから一気に上がる！", "ええ感じ。基礎が固まってきてる！"],
  3: ["だいぶ強い。あと一押しで無双やで。", "もうそれ、合格圏の匂いしてる。"],
  4: ["天才なん？もう教えることあらへん…（うれしい）", "強すぎ。こっちがテストされてる気分やわ。"],
};

function sampleOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// MAJOR を categoryId（"TECHNOLOGY.SOFTWARE"）から推定
function majorOf(categoryId: string) {
  return categoryId.split(".")[0] ?? "";
}

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<number, Level>>({});
  const [preset, setPreset] = useState<SelectPreset | null>(null);

  const [pool, setPool] = useState<Word[]>([]);
  const [phase, setPhase] = useState<Phase>("quiz");

  // 出題順（pool順に1周）
  const [qIndex, setQIndex] = useState(0);

  // スコア
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);

  // 1問の状態
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // 定着度メッセージ（回答後に表示）
  const [levelMsg, setLevelMsg] = useState<string>("");

  // 終了時コメント（セッション固定）
  const [resultComment, setResultComment] = useState<string>("");

  // トロフィー演出
  const [toast, setToast] = useState<string | null>(null);

  const presetKey = useMemo(() => {
    if (!preset) return "";
    return [(preset.categoryIds ?? []).join(","), (preset.levels ?? []).join(","), preset.order].join("|");
  }, [preset]);

  // 初期ロード
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
        mode: "quiz",
      };

    setPreset({ ...merged, mode: "quiz" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pool生成（条件変更で作り直し）
  useEffect(() => {
    if (!words.length || !preset) return;

    const nextPool = applyFilters(words, preset, progress);

    setPool(nextPool);
    setPhase("quiz");
    setQIndex(0);
    setAnswered(0);
    setCorrect(0);
    setSelected(null);
    setIsCorrect(null);
    setChoices([]);
    setLevelMsg("");
    setToast(null);
    setResultComment("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length, presetKey]);

  const current = pool[qIndex];

  const headerRight = useMemo(() => {
    const total = pool.length;
    const pos = total ? qIndex + 1 : 0;
    return total ? `${pos}/${total}問  正解${correct}` : "";
  }, [qIndex, pool.length, correct]);

  function goHome() {
    router.push("/");
  }
  function goSelect() {
    router.push("/select");
  }

  // --- 4択生成（meaning重複なし前提＋念のためガード）
  function buildChoicesFor(w: Word, allWords: Word[]) {
    const correctMeaning = w.meaning;

    // 誤答候補：同categoryId → 同major → 全体
    const sameCategory = allWords.filter((x) => x.id !== w.id && x.categoryId === w.categoryId);
    const sameMajor = allWords.filter((x) => x.id !== w.id && majorOf(x.categoryId) === majorOf(w.categoryId));
    const global = allWords.filter((x) => x.id !== w.id);

    const toMeanings = (arr: Word[]) => arr.map((x) => x.meaning).filter((m) => m !== correctMeaning);

    const picked = new Set<string>();
    const wrongs: string[] = [];

    function takeFrom(source: string[]) {
      for (const m of source) {
        if (wrongs.length >= 3) break;
        if (picked.has(m)) continue;
        picked.add(m);
        wrongs.push(m);
      }
    }

    takeFrom(toMeanings(sameCategory));
    takeFrom(toMeanings(sameMajor));
    takeFrom(toMeanings(global));

    if (wrongs.length < 3) return null;

    return shuffle([correctMeaning, ...wrongs.slice(0, 3)]);
  }

  function setupQuestion() {
    if (!current) return;

    const opts = buildChoicesFor(current, words);
    if (!opts) {
      setPhase("result");
      return;
    }

    setChoices(opts);
    setSelected(null);
    setIsCorrect(null);
    setLevelMsg("");
  }

  useEffect(() => {
    if (!pool.length) return;
    if (phase !== "quiz") return;
    if (!current) return;
    setupQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, pool.length, phase]);

  function makeLevelMessage(before: Level, after: Level, ok: boolean) {
    if (ok) {
      if (before === 4 && after === 4) {
        return "定着度は完璧です。";
      }
      return `定着度を「${LEVEL_LABEL[before]}」から「${LEVEL_LABEL[after]}」にUP！`;
    }

    // 不正解（or スキップ）
    if (after === 1) {
      return "定着度は「わからない」、つまり伸びしろです。";
    }
    return `定着度を「${LEVEL_LABEL[before]}」から「${LEVEL_LABEL[after]}」にDOWN。`;
  }

  function applyProgressUpdate(ok: boolean, skipped: boolean) {
    if (!current) return;

    const beforeLv = getLevel(progress, current.id);
    const afterLv = ok ? levelUp(beforeLv) : levelDownMin1(beforeLv);

    const nextProg = setLevel(progress, current.id, afterLv);
    setProgress(nextProg);
    saveProgress(nextProg);

    setLevelMsg(makeLevelMessage(beforeLv, afterLv, ok));

    // トロフィー：正解のみ累計加算（スキップ/不正解は増やさない）
    if (ok && !skipped) {
      const beforeTotal = loadQuizCorrectTotal();
      const beforeTrophy = calcTrophyCount(beforeTotal);

      const afterTotal = addQuizCorrect(1);
      const afterTrophy = calcTrophyCount(afterTotal);

      if (afterTrophy > beforeTrophy) {
        setToast(`🎉 トロフィー解放！ ${afterTrophy}個目`);
        window.setTimeout(() => setToast(null), 1500);
      }
    }
  }

  function answer(choice: string) {
    if (!current) return;
    if (isCorrect !== null) return; // 解答済み

    setSelected(choice);

    const ok = choice === current.meaning;
    setIsCorrect(ok);

    setAnswered((p) => p + 1);
    if (ok) setCorrect((p) => p + 1);

    applyProgressUpdate(ok, false);
  }

  // ⑤ スキップ：不正解扱い＋解説表示（＝答えを見せる）
  function skipAsWrong() {
    if (!current) return;
    if (isCorrect !== null) return;

    setSelected("（スキップ）");
    setIsCorrect(false);
    setAnswered((p) => p + 1);

    applyProgressUpdate(false, true);
  }

  function next() {
    if (phase !== "quiz") return;
    if (isCorrect === null) return; // 未解答は進めない

    const last = qIndex === pool.length - 1;
    if (last) {
      const acc = answered ? correct / answered : 0;
      const bucket = pickCommentBucket(acc);
      setResultComment(sampleOne(COMMENTS[bucket]));
      setPhase("result");
      return;
    }

    setQIndex((p) => p + 1);
  }

  function retrySameCondition() {
    if (!words.length || !preset) return;

    const nextPool = applyFilters(words, preset, progress);

    setPool(nextPool);
    setPhase("quiz");
    setQIndex(0);
    setAnswered(0);
    setCorrect(0);
    setSelected(null);
    setIsCorrect(null);
    setChoices([]);
    setLevelMsg("");
    setToast(null);
    setResultComment("");
  }

  if (!pool.length) {
    return (
      <>
        <Header title="クイズ" right="" />
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.emptyTitle}>クイズを作れへんかった…</div>
            <div className={styles.emptyHint}>
              条件の単語が少ないか、4択に必要な誤答が足りへんかったみたい。
              <br />
              条件をゆるめるか、words.json を増やしてな。
            </div>

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

  if (phase === "result") {
    const acc = answered ? Math.round((correct / answered) * 100) : 0;
    const mood = acc >= 80 ? "happy" : acc >= 60 ? "smile" : acc >= 40 ? "neutral" : acc >= 20 ? "worry" : "sad";

    return (
      <>
        <Header title="クイズ結果" right={`${correct}/${answered} 正答`} />

        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.resultTop}>
              <div className={`${styles.dog} ${styles[`dog_${mood}`]}`} aria-hidden />
              <div className={styles.resultText}>
                <div className={styles.resultScore}>
                  {correct} / {answered}（{acc}%）
                </div>
                <div className={styles.bubble}>{resultComment}</div>
              </div>
            </div>

            <div className={styles.resultActions}>
              <button className={styles.btnPrimary} onClick={retrySameCondition}>
                もう一回（同条件） →
              </button>
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

  // 出題画面
  const correctMeaning = current.meaning;

  return (
    <>
      <Header title="クイズ" right={headerRight} />

      <main className={styles.main}>
        <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`} aria-live="polite">
          {toast ?? ""}
        </div>

        <section className={styles.card}>
          <div className={styles.metaRow}>
            <div className={styles.category}>{categoryIdLabel(current.categoryId)}</div>
            <div className={styles.small}>{preset?.order === "seq" ? "順番どおり" : "ランダム"}</div>
          </div>

          <div className={styles.questionLabel}>問題</div>
          <h2 className={styles.term}>{current.term}</h2>

          <div className={styles.choiceGrid}>
            {choices.map((c) => {
              const chosen = selected === c;
              const correctAns = isCorrect !== null && c === correctMeaning;

              const cls =
                isCorrect === null
                  ? styles.choice
                  : correctAns
                  ? `${styles.choice} ${styles.choiceCorrect}`
                  : chosen
                  ? `${styles.choice} ${styles.choiceChosen}`
                  : `${styles.choice} ${styles.choiceDim}`;

              return (
                <button key={c} className={cls} onClick={() => answer(c)} disabled={isCorrect !== null}>
                  {c}
                </button>
              );
            })}
          </div>

          {/* ⑤ スキップ（不正解扱い＋解説表示） */}
          {isCorrect === null && (
            <div className={styles.skipRow}>
              <button className={styles.btnSkipAction} onClick={skipAsWrong}>
                スキップ（わからん） →
              </button>
            </div>
          )}

          {isCorrect !== null && (
            <div className={styles.afterBox}>
              <div className={styles.judgeRow}>
                <span className={isCorrect ? styles.judgeOK : styles.judgeNG}>{isCorrect ? "正解！" : "不正解…"}</span>
              </div>

              {/* ① 正解meaningは常に黒字で見やすく */}
              <div className={styles.correctBlock}>
                <div className={styles.correctLabel}>正解</div>
                <div className={styles.correctMeaning}>{correctMeaning}</div>
              </div>

              {/* ②③ 定着度メッセージを詳細化 */}
              {levelMsg && <div className={styles.levelMsg}>{levelMsg}</div>}

              {current.detail && (
                <details className={styles.details} open>
                  <summary>詳細解説</summary>
                  <div className={styles.detail}>{current.detail}</div>
                </details>
              )}

              {/* ④ 次へは右寄せ＆横長 */}
              <div className={styles.nextRow}>
                <button className={styles.btnNext} onClick={next}>
                  次へ →
                </button>
              </div>
            </div>
          )}

          {isCorrect === null && <div className={styles.hintText}>4択を選んでな（答えたら解説が出るで）</div>}
        </section>

        <div className={styles.bottomNav}>
          <button className={styles.btnGhost} onClick={goSelect}>
            条件を変える
          </button>
          <button className={styles.btnGhost} onClick={goHome}>
            ホームへ
          </button>
        </div>
      </main>
    </>
  );
}
