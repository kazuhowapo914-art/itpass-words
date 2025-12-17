// app/study/page.tsx
import { Suspense } from "react";
import StudyClient from "./StudyClient";

export default function StudyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>読み込み中…</main>}>
      <StudyClient />
    </Suspense>
  );
}
