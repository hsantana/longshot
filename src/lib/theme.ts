// Dark is the default everywhere. The landing page ("/") is always dark —
// no toggle, no OS preference check. Account pages (Performance/Style/
// Portfolio) default to dark for first-time visitors but can be switched to
// light via ThemeToggle; that choice is remembered in localStorage.

export const THEME_STORAGE_KEY = "longshot-theme";

function themeScript(storageKey: string): string {
  return `(function(){try{var isLanding=window.location.pathname==="/";var stored=isLanding?null:localStorage.getItem("${storageKey}");var dark=stored?stored==="dark":true;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;
}

/** Blocking init script (next/script strategy="beforeInteractive") — sets the
 * `dark` class before first paint so there's no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = themeScript(THEME_STORAGE_KEY);

export function computeIsDark(pathname: string): boolean {
  const isLanding = pathname === "/";
  const stored = isLanding ? null : localStorage.getItem(THEME_STORAGE_KEY);
  return stored ? stored === "dark" : true;
}

export function applyTheme(pathname: string): void {
  document.documentElement.classList.toggle("dark", computeIsDark(pathname));
}
