import { Header } from "@/components/Header";
import { DogMascot } from "@/components/DogMascot";
import Link from "next/link";
import styles from "./page.module.css";
import Image from "next/image";

export default function HomePage() {
  return (
    <>
      <Header title="関西弁ITパスポート単語アプリ" />

      <main className={styles.main}>
        <DogMascot message="単語帳モードで学習して、テストモードで腕試ししよう" />

        <div className={styles.buttons}>
          <Link href="/select" className={styles.primary}>
            学習する(単語帳モード/テストモード)
          </Link>

          <Link href="/list" className={styles.danger}>
            単語一覧を見る
          </Link>

          <Link href="/progress" className={styles.progress}>
            進捗確認
          </Link>
        </div>
        
        <div style={{ width: "100%", maxWidth: 520, marginTop: 16 }}>
  {/* <div style={{ fontWeight: 800, marginBottom: 8 }}>定着度の更新ルール</div> */}

  <Image
    src="/explain/progress-explain.webp"
    alt="定着度の更新ルール"
    width={1200}
    height={700}
    style={{
      width: "100%",
      height: "auto",
      borderRadius: 16,
      boxShadow: "var(--shadow-soft)",
      background: "white",
    }}
    priority
  />

  {/* <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
    ※ 単語帳とテストで更新ルールが違うで
  </div> */}
</div>
      </main>
    </>
  );
}
