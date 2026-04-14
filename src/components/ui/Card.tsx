"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  header?: ReactNode;
  footer?: ReactNode;
}

export default function Card({
  variant = "default",
  padding = "md",
  header,
  footer,
  children,
  className = "",
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    styles[`pad-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
