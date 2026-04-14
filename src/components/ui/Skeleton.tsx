import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: "text" | "circular" | "rectangular";
  lines?: number;
  className?: string;
}

export default function Skeleton({
  width,
  height,
  variant = "text",
  lines = 1,
  className = "",
}: SkeletonProps) {
  if (variant === "text" && lines > 1) {
    return (
      <div className={`${styles.textGroup} ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${styles.text}`}
            style={{
              width: i === lines - 1 ? "60%" : width || "100%",
              height: height || "14px",
            }}
          />
        ))}
      </div>
    );
  }

  const variantClass = styles[variant] || "";

  return (
    <div
      className={`${styles.skeleton} ${variantClass} ${className}`}
      style={{ width, height }}
    />
  );
}
