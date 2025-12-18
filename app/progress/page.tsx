"use client";

import { useEffect, useMemo, useState } from "react";

import type { Word } from "@/types/word";
import { fetchWords } from "@/lib/words";
import { Header } from "@/components/Header";

import {
  loadProgress,
  loadQuizCorrectTotal,
  calcTrophyCount,
  resetAll,
} from "@/lib/storage";

import {
  type Level
} from "@/lib/selectPreset";

import { MAJOR, MINOR, categoryIdLabel, type MajorKey, type MinorKey } from "@/constants/categories";
import { TROPHIES, type Trophy } from "@/constants/trophies";

import styles from "./page.module.css";

type LevelCounts = Record<Level, number>;

const LEVELS: Level[] = [0, 1, 2, 3, 4];
const LEVEL_LABEL: Record<Level, string> = {
  0: "未学習",
  1: "わからない",
  2: "覚えかけ",
  3: "もうちょい",
  4: "完璧",
};

function emptyCounts(): LevelCounts {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function getLevel(progress: Record<number, Level>, id: number): Level {
  return progress[id] ?? 0;
}

function countLevels(words: Word[], progress: Record<number, Level>): LevelCounts {
  const c = emptyCounts();
  for (const w of words) {
    const lv = getLevel(progress, w.id);
    c[lv] += 1;
  }
  return c;
}

function Bar({
  counts,
  total,
}: {
  counts: LevelCounts;
  total: number;
}) {
  const seg = (lv: Level) => (total ? (counts[lv] / total) * 100 : 0);

  return (
    <div className={styles.barWrap} aria-label="progress bar">
      <div className={`${styles.seg} ${styles.lv0}`} style={{ width: `${seg(0)}%` }} />
      <div className={`${styles.seg} ${styles.lv1}`} style={{ width: `${seg(1)}%` }} />
      <div className={`${styles.seg} ${styles.lv2}`} style={{ width: `${seg(2)}%` }} />
      <div className={`${styles.seg} ${styles.lv3}`} style={{ width: `${seg(3)}%` }} />
      <div className={`${styles.seg} ${styles.lv4}`} style={{ width: `${seg(4)}%` }} />
    </div>
  );
}

function Legend({ counts, total }: { counts: LevelCounts; total: number }) {
  const item = (lv: Level, cls: string) => {
    const p = pct(counts[lv], total);
    return (
      <span className={styles.key}>
        <span className={`${styles.dot} ${cls}`} />
        {LEVEL_LABEL[lv]} {counts[lv]}/{total}（{p}%）
      </span>
    );
  };

  return (
    <div className={styles.legend}>
      {item(0, styles.lv0)}
      {item(1, styles.lv1)}
      {item(2, styles.lv2)}
      {item(3, styles.lv3)}
      {item(4, styles.lv4)}
    </div>
  );
}

export default function ProgressPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<number, Level>>({});
  const [totalCorrect, setTotalCorrect] = useState(0);

  const [openMajors, setOpenMajors] = useState<Set<MajorKey>>(new Set());

  useEffect(() => {
    setProgress(loadProgress());
    setTotalCorrect(loadQuizCorrectTotal());
    fetchWords().then(setWords).catch(console.error);
  }, []);

  const allCounts = useMemo(() => countLevels(words, progress), [words, progress]);
  const total = words.length;
  const perfect = allCounts[4];
  const perfectPct = pct(perfect, total);

  const trophyCount = useMemo(() => calcTrophyCount(totalCorrect), [totalCorrect]);

  const majorKeys = useMemo(() => Object.keys(MAJOR) as MajorKey[], []);
  const minorKeysByMajor = useMemo(() => {
    const out: Record<MajorKey, MinorKey[]> = {} as any;
    for (const m of majorKeys) out[m] = Object.keys(MINOR[m]) as MinorKey[];
    return out;
  }, [majorKeys]);

  const wordsByMajor = useMemo(() => {
    const out: Record<MajorKey, Word[]> = {} as any;
    for (const mj of majorKeys) out[mj] = [];
    for (const w of words) {
      const mj = w.categoryId.split(".")[0] as MajorKey;
      if (mj in MAJOR) out[mj].push(w);
    }
    for (const mj of majorKeys) out[mj].sort((a, b) => a.id - b.id);
    return out;
  }, [words, majorKeys]);

  function wordsByMinor(categoryId: string) {
    return words.filter((w) => w.categoryId === categoryId);
  }

  function toggleMajor(mj: MajorKey) {
    setOpenMajors((prev) => {
      const next = new Set(prev);
      if (next.has(mj)) next.delete(mj);
      else next.add(mj);
      return next;
    });
  }

function cheerMessage(perfectPct: number) {
  if (perfectPct >= 80) return "もうプロやん！";
  if (perfectPct >= 50) return "だいぶ仕上がってきたで！";
  if (perfectPct >= 20) return "コツコツえらい！";
  return "今からや、気楽にいこ🐶";
}


  function onResetAll() {
    const ok = window.confirm("進捗（定着度）と前回条件と累計正解数を全部リセットするで？ほんまにええ？");
    if (!ok) return;
    resetAll();
    setProgress({});
    setTotalCorrect(0);
  }

  if (!words.length) {
    return (
      <>
        <Header title="進捗" right="" />
        <main className={styles.main}>
          <div className={styles.card}>読み込み中…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="進捗" right={`完璧 ${perfectPct}%`} />

      <main className={styles.main}>
        {/* 全体 */}
        <section className={styles.card} style={{ position: "relative" }}>
            <img
    src="/dog/dog-cheer.png"
    // alt="応援してくれる犬"
    className={styles.dogImg}
  />
  <div className={styles.dogMsg}>
    {cheerMessage(perfectPct)}
  </div>
          <div className={styles.rowTop}>
        <div className={styles.dogWrap}>

</div>

            <div>
              <div className={styles.title}>全体の進捗</div>
              <div className={styles.sub}>完璧 {perfect}/{total}（{perfectPct}%）</div>
            </div>
            <div className={styles.bigPct}>{perfectPct}%</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <Bar counts={allCounts} total={total} />
          </div>

          <div style={{ marginTop: 10 }}>
            <Legend counts={allCounts} total={total} />
          </div>

          <div className={styles.hr} />

          {/* トロフィー */}
          <div className={styles.rowTop}>
            <div>
              <div className={styles.title}>トロフィー</div>
              <div className={styles.sub}>
                累計正解 {totalCorrect} / 解放 {trophyCount}（テスト10問正解ごと）
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {TROPHIES.slice(0, 20).map((t: Trophy, i: number) => {
              const unlocked = i < trophyCount;
              return (
                <div
                  key={t.idx}
                  style={{
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 16,
                    padding: 10,
                    background: unlocked ? "white" : "rgba(0,0,0,0.03)",
                    opacity: unlocked ? 1 : 0.6,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {unlocked ? `🏆 ${t.title}` : `🔒 ???`}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {unlocked ? t.message : "あと"+(i-1)+(10 - (totalCorrect % 10))+"問…！"}
                  </div>
                </div>
              );
            })}

            {totalCorrect >= 140 && (
              <div
                style={{
                  border: "1px dashed rgba(0,0,0,0.2)",
                  borderRadius: 16,
                  padding: 10,
                  background: "rgba(0,0,0,0.02)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
                title="20個超"
              >
                20+
              </div>
            )}
          </div>
        </section>

        {/* major/minor */}
        <section className={styles.stack} style={{ marginTop: 14 }}>
          {majorKeys.map((mj) => {
            const ws = wordsByMajor[mj];
            const counts = countLevels(ws, progress);
            const totalM = ws.length;
            const p = pct(counts[4], totalM);

            const open = openMajors.has(mj);

            return (
              <div key={mj} className={styles.majorCard}>
                <button className={styles.majorHead} onClick={() => toggleMajor(mj)}>
                  <div className={styles.majorHeadTop}>
                    <div className={styles.title}>{MAJOR[mj]}</div>
                    <div className={styles.chev}>{open ? "▲" : "▼"}</div>
                  </div>

                  <div className={styles.sub}>
                    完璧 {counts[4]}/{totalM}（{p}%）
                  </div>

                  <Bar counts={counts} total={totalM} />
                </button>

                {open && (
                  <div className={styles.majorBody}>
                    <Legend counts={counts} total={totalM} />

                    {minorKeysByMajor[mj].map((mn) => {
                      const cid = `${mj}.${mn}`;
                      const ms = wordsByMinor(cid);
                      const c2 = countLevels(ms, progress);
                      const t2 = ms.length;
                      const p2 = pct(c2[4], t2);

                      return (
                        <div key={cid} className={styles.minorRow}>
                          <div className={styles.rowTop}>
                            <div>
                              <div className={styles.title} style={{ fontSize: 14 }}>
                                {categoryIdLabel(cid)}
                              </div>
                              <div className={styles.sub}>
                                完璧 {c2[4]}/{t2}（{p2}%）
                              </div>
                            </div>
                            <div style={{ fontWeight: 900 }}>{p2}%</div>
                          </div>

                          <Bar counts={c2} total={t2} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
          ※ 未学習は「まだ一度も単語帳/クイズで触ってない単語」やで
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={onResetAll}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(229,57,53,0.08)",
              fontWeight: 800,
            }}
          >
            全進捗リセット（危険）
          </button>
        </div>
      </main>
    </>
  );
}
