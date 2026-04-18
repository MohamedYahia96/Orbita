import Image from "next/image";
import styles from "./Avatar.module.css";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeToPixels = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
} as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f59e0b", "#22c55e", "#3b82f6", "#14b8a6",
  ];
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({
  src,
  alt,
  name = "",
  size = "md",
  className = "",
}: AvatarProps) {
  const classes = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(" ");
  const pixelSize = sizeToPixels[size];

  if (src) {
    return (
      <div className={classes}>
        <Image src={src} alt={alt || name || "Avatar"} width={pixelSize} height={pixelSize} className={styles.image} unoptimized />
      </div>
    );
  }

  return (
    <div
      className={classes}
      style={{ background: getColorFromName(name) }}
      aria-label={name}
    >
      <span className={styles.initials}>{getInitials(name || "U")}</span>
    </div>
  );
}
