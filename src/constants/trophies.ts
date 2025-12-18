// src/constants/trophies.ts
export type Trophy = {
  idx: number; // 1..20
  title: string;
  message: string;
  dogSrc: string; // /trophies/dog-01.png
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export const TROPHIES: Trophy[] = Array.from({ length: 20 }, (_, i) => {
  const idx = i + 1;
  return {
    idx,
    title: `トロフィー ${idx}`,
    dogSrc: `/trophies/dog-${pad2(idx)}.webp`,
    message: [
      `トロフィー${idx}こめ獲得`
    ].join("\n"),
  };
});
