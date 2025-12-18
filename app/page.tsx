import { Header } from "@/components/Header";
import { DogMascot } from "@/components/DogMascot";
import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <Header title="関西弁ITパスポート単語アプリ" />

      <main className={styles.main}>
        <DogMascot message="単語帳モードとテストモードがあるで" />

        <div className={styles.buttons}>
          <Link href="/select" className={styles.primary}>
            学習する(単語帳モード/テストモード)
          </Link>

          {/* <Link href="/select?startLast=1" className={styles.secondary}>
            前回の条件で開始
          </Link> */}

          <Link href="/progress" className={styles.success}>
            進捗確認
          </Link>
        </div>
      </main>
    </>
  );
}
