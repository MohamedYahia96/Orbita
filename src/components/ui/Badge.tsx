import styles from "./Badge.module.css";
import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  const classes = [styles.badge, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
