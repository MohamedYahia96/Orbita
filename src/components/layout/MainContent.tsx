"use client";

import type { ReactNode } from "react";
import styles from "./MainContent.module.css";

export interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  return (
    <main className={styles.main}>
      <div className={styles.container}>{children}</div>
    </main>
  );
}
