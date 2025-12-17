"use client";

import Link from "next/link";
import styles from "./Header.module.css";

type Props = {
  title: string;
  right?: React.ReactNode;
};

export function Header({ title, right }: Props) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.home}>
        🏠
      </Link>

      <div className={styles.title}>{title}</div>

      <div className={styles.right}>
        {right}
      </div>
    </header>
  );
}
