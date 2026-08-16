"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { registerOrbitaServiceWorker } from "@/lib/pwa";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      registerOrbitaServiceWorker().catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    }
  }, []);

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  );
}
