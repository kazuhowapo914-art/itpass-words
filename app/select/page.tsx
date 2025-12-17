// app/select/page.tsx
import { Suspense } from "react";
import SelectClient from "./SelectClient";

export default function SelectPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>読み込み中…</main>}>
      <SelectClient />
    </Suspense>
  );
}
