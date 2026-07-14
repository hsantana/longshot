// Manual dark-mode toggle for account pages only. The landing page ("/")
// always mirrors the OS/browser preference and ignores any stored choice.

export const THEME_STORAGE_KEY = "longshot-theme";

function themeScript(storageKey: string): string {
  return `(function(){try{var isLanding=window.location.pathname==="/";var stored=isLanding?null:localStorage.getItem("${storageKey}");var systemDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=stored?stored==="dark":systemDark;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;
}

/** Blocking init script (next/script strategy="beforeInteractive") — sets the
 * `dark` class before first paint so there's no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = themeScript(THEME_STORAGE_KEY);

export function computeIsDark(pathname: string): boolean {
  const isLanding = pathname === "/";
  const stored = isLanding ? null : localStorage.getItem(THEME_STORAGE_KEY);
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return stored ? stored === "dark" : systemDark;
}

export function applyTheme(pathname: string): void {
  document.documentElement.classList.toggle("dark", computeIsDark(pathname));
}
