// app/quiz/page.tsx
import { Suspense } from "react";
import QuizClient from "./QuizClient";

export default function QuizPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>読み込み中…</main>}>
      <QuizClient />
    </Suspense>
  );
}
