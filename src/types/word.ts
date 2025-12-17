// src/types/word.ts
export type Word = {
  id: number;
  term: string;
  meaning: string;
  detail?: string;
  categoryId: string; // "MAJOR.MINOR"
  tags?: string[];
};
