"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, THEME_STORAGE_KEY } from "@/lib/theme";

/** Keeps the `dark` class correct across client-side navigation and system
 * preference changes. Renders nothing. */
export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(pathname);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => applyTheme(pathname);
    mq.addEventListener("change", onSystemChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) applyTheme(pathname);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  return null;
}
