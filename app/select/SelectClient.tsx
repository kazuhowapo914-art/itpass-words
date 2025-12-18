"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Header } from "@/components/Header";
import { MAJOR, MINOR, categoryIdLabel, type MajorKey } from "@/constants/categories";

import type { SelectPreset, Level } from "@/lib/selectPreset.ts";
import { DEFAULT_PRESET, TODAY_RECOMMEND } from "@/lib/selectPreset";
import { loadPreset, savePreset } from "@/lib/storage";
import { mergePreset, presetToQuery, queryToPreset } from "@/lib/engine";

import styles from "./page.module.css";

const LEVEL_UI: Record<Level, string> = {
  0: "未学習",
  1: "わからない",
  2: "覚えかけ",
  3: "覚えた",
  4: "完璧",
};

function toggleSet<T>(set: Set<T>, v: T) {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export default function SelectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const majorKeys = useMemo(() => Object.keys(MAJOR) as MajorKey[], []);
  const allCategoryIds = useMemo(() => {
    const out: string[] = [];
    for (const mj of majorKeys) {
      for (const mn of Object.keys(MINOR[mj])) {
        out.push(`${mj}.${mn}`);
      }
    }
    return out;
  }, [majorKeys]);

  const [preset, setPreset] = useState<SelectPreset>(DEFAULT_PRESET);

  // 初期化：URL優先 → localStorage → default
  useEffect(() => {
    const urlHasAny = searchParams.toString().length > 0;
    const urlPreset = urlHasAny ? queryToPreset(searchParams) : null;

    const saved = loadPreset();
    setPreset(mergePreset(urlPreset, saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const startLast = searchParams.get("startLast") === "1";
if (startLast) {
  const saved = loadPreset();
  const p = mergePreset(null, saved); // いつもの復元ロジックでOK
  savePreset(p);

  const q = presetToQuery(p);
  router.replace("/select"); // URLを綺麗に戻す（任意）
  router.push(p.mode === "study" ? `/study${q}` : `/quiz${q}`);
  return;
}

  }, []);

  // state -> URL同期（再現性）
  useEffect(() => {
    const q = presetToQuery(preset);
    router.replace(`/select${q}`);
  }, [preset, router]);

  const selectedCats = useMemo(() => new Set(preset.categoryIds), [preset.categoryIds]);
  const selectedLv = useMemo(() => new Set(preset.levels), [preset.levels]);

  // major単位の全選択/一部選択チェック
  function majorAllSelected(mj: MajorKey) {
    const minors = Object.keys(MINOR[mj]);
    if (!minors.length) return false;
    return minors.every((mn) => selectedCats.has(`${mj}.${mn}`));
  }
  function majorSomeSelected(mj: MajorKey) {
    const minors = Object.keys(MINOR[mj]);
    return minors.some((mn) => selectedCats.has(`${mj}.${mn}`));
  }

  function toggleMajor(mj: MajorKey) {
    const minors = Object.keys(MINOR[mj]);
    const all = minors.every((mn) => selectedCats.has(`${mj}.${mn}`));

    const nextCats = new Set(selectedCats);
    for (const mn of minors) {
      const id = `${mj}.${mn}`;
      if (all) nextCats.delete(id);
      else nextCats.add(id);
    }
    setPreset((p) => ({ ...p, categoryIds: Array.from(nextCats) }));
  }

  function toggleCategory(id: string) {
    const nextCats = toggleSet(selectedCats, id);
    setPreset((p) => ({ ...p, categoryIds: Array.from(nextCats) }));
  }

  function clearAll() {
    setPreset(DEFAULT_PRESET);
  }

  function applyTodayRecommend() {
    // 今日のおすすめ：lv=[1,2], order=random, mode=quiz
    setPreset((p) => ({
      ...p,
      levels: TODAY_RECOMMEND.levels ?? p.levels,
      order: TODAY_RECOMMEND.order ?? p.order,
      mode: TODAY_RECOMMEND.mode ?? p.mode,
    }));
  }

  function toggleLevel(lv: Level) {
    const nextLv = toggleSet(selectedLv, lv);
    setPreset((p) => ({ ...p, levels: Array.from(nextLv).sort((a, b) => a - b) as Level[] }));
  }

  // minorを選んでなくても定着度フィルタ出す（仕様）
  const showLevelFilter = preset.categoryIds.length >= 0;

  const summaryRight = useMemo(() => {
    const catText = preset.categoryIds.length ? `${preset.categoryIds.length}カテゴリ` : "全カテゴリ";
    const lvText = preset.levels.length ? `Lv:${preset.levels.join(",")}` : "全Lv";
    const modeText = preset.mode === "study" ? "単語帳" : "テスト";
    const orderText = preset.order === "seq" ? "順番" : "ランダム";
    return `${catText} / ${showLevelFilter ? lvText : "Lv:—"} / ${modeText} / ${orderText}`;
  }, [preset, showLevelFilter]);

  function start() {
    // 学習開始押下時のみ保存（仕様）
    savePreset(preset);

    const q = presetToQuery(preset);
    router.push(preset.mode === "study" ? `/study${q}` : `/quiz${q}`);
  }

  return (
    <>
      <Header title="学習条件" right={summaryRight} />

      <main className={styles.main}>
        <div className={styles.topRow}>
          <button className={styles.softBtn} onClick={applyTodayRecommend}>
            今日のおすすめ
          </button>

          <button className={styles.softBtn} onClick={clearAll}>
            条件クリア
          </button>

          <Link className={styles.softLink} href="/progress">
            進捗確認 →
          </Link>
        </div>

        {/* カテゴリ */}
        <section className={styles.card}>
          <div className={styles.sectionTitle}>カテゴリ（複数選択OK）</div>

          <div className={styles.grid}>
            {majorKeys.map((mj) => {
              const all = majorAllSelected(mj);
              const some = majorSomeSelected(mj);

              return (
                <div key={mj} className={styles.majorCard}>
                  <label className={styles.majorRow}>
                    <input
                      type="checkbox"
                      checked={all}
                      ref={(el) => {
                        if (el) el.indeterminate = !all && some;
                      }}
                      onChange={() => toggleMajor(mj)}
                    />
                    <span className={styles.majorLabel}>{MAJOR[mj]}</span>
                  </label>

                  <div className={styles.minorList}>
                    {Object.keys(MINOR[mj]).map((mn) => {
                      const id = `${mj}.${mn}`;
                      const checked = selectedCats.has(id);

                      return (
                        <label key={id} className={styles.minorRow}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCategory(id)} />
                          <span className={styles.minorLabel}>{MINOR[mj][mn as keyof typeof MINOR[typeof mj]]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* <div className={styles.hint}>
            ※ majorをチェックすると配下minorが全部ONになるで（中間状態も表示する）
          </div> */}
        </section>

        {/* 定着度（カテゴリが選ばれた時だけ表示） */}
        {showLevelFilter && (
          <section className={styles.card}>
            <div className={styles.sectionTitle}>定着度（複数選択OK）</div>

            <div className={styles.levelRow}>
              {(Object.keys(LEVEL_UI) as unknown as Level[]).map((lv) => {
                const checked = selectedLv.has(lv);
                return (
                  <button
                    key={lv}
                    className={`${styles.levelPill} ${checked ? styles.levelPillOn : ""}`}
                    onClick={() => toggleLevel(lv)}
                    type="button"
                  >
                    {LEVEL_UI[lv]}
                  </button>
                );
              })}
            </div>

            <div className={styles.hint}>※ 何も選ばなければ全て対象</div>
          </section>
        )}

        {/* 出題順序・形式 */}
        <section className={styles.card}>
          <div className={styles.sectionTitle}>出題設定</div>

          <div className={styles.twoCols}>
            <div>
              <div className={styles.subTitle}>出題順序</div>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="order"
                  checked={preset.order === "seq"}
                  onChange={() => setPreset((p) => ({ ...p, order: "seq" }))}
                />
                順番どおり（ID昇順）
              </label>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="order"
                  checked={preset.order === "random"}
                  onChange={() => setPreset((p) => ({ ...p, order: "random" }))}
                />
                ランダム（1周ごとにシャッフル）
              </label>
            </div>

            <div>
              <div className={styles.subTitle}>出題形式</div>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="mode"
                  checked={preset.mode === "study"}
                  onChange={() => setPreset((p) => ({ ...p, mode: "study" }))}
                />
                単語帳
              </label>
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name="mode"
                  checked={preset.mode === "quiz"}
                  onChange={() => setPreset((p) => ({ ...p, mode: "quiz" }))}
                />
                テスト（4択）
              </label>
            </div>
          </div>
        </section>

        {/* 下固定：開始ボタン */}
        <div className={styles.bottomBar}>
          <button className={styles.startBtn} onClick={start}>
            学習開始 ▶
          </button>
        </div>

        <div className={styles.bottomSpacer} />
      </main>
    </>
  );
}
