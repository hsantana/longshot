"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, THEME_STORAGE_KEY } from "@/lib/theme";

/** Keeps the `dark` class correct across client-side navigation and other
 * tabs changing the stored preference. Renders nothing. */
export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(pathname);

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) applyTheme(pathname);
    };
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  return null;
}
