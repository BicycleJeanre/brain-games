export type CanonicalTheme = "system" | "light" | "dark";
export type CanonicalView = "home" | "play" | "progress" | "settings";
export interface CanonicalSettings {
  version: 1;
  theme: CanonicalTheme;
  showTimer: boolean;
  showControlHelp: boolean;
  updatedAt: number;
}

export const CANONICAL_THEME_KEY = "brain-games-theme";
export const CANONICAL_SETTINGS_KEY = "brain-games-settings-v1";
const defaultSettings: CanonicalSettings = { version: 1, theme: "system", showTimer: true, showControlHelp: true, updatedAt: 0 };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character]!);

function legacyThemePreference(): CanonicalTheme {
  const value = localStorage.getItem(CANONICAL_THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function hasCanonicalSettings() {
  return localStorage.getItem(CANONICAL_SETTINGS_KEY) !== null;
}

export function canonicalSettings(): CanonicalSettings {
  try {
    const value = JSON.parse(localStorage.getItem(CANONICAL_SETTINGS_KEY) || "null") as Partial<CanonicalSettings> | null;
    if (value?.version === 1) return {
      version: 1,
      theme: value.theme === "light" || value.theme === "dark" ? value.theme : "system",
      showTimer: typeof value.showTimer === "boolean" ? value.showTimer : true,
      showControlHelp: typeof value.showControlHelp === "boolean" ? value.showControlHelp : true,
      updatedAt: Number(value.updatedAt) || 0,
    };
  } catch { /* fall through to a safe migrated default */ }
  return { ...defaultSettings, theme: legacyThemePreference() };
}

function storeCanonicalSettings(settings: CanonicalSettings) {
  localStorage.setItem(CANONICAL_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(CANONICAL_THEME_KEY, settings.theme);
  applyCanonicalTheme(settings.theme);
  dispatchEvent(new CustomEvent("brain-games-settings-change", { detail: settings }));
  return settings;
}

export function initialiseCanonicalSettings(settings: Pick<CanonicalSettings, "theme" | "showTimer" | "showControlHelp">, updatedAt = 0) {
  if (hasCanonicalSettings()) return canonicalSettings();
  return storeCanonicalSettings({ ...defaultSettings, ...settings, updatedAt });
}

export function setCanonicalSettings(next: Partial<Pick<CanonicalSettings, "theme" | "showTimer" | "showControlHelp">>) {
  const settings: CanonicalSettings = { ...canonicalSettings(), ...next, version: 1, updatedAt: Date.now() };
  return storeCanonicalSettings(settings);
}

export function adoptCanonicalSettings(next: Pick<CanonicalSettings, "theme" | "showTimer" | "showControlHelp">, updatedAt: number) {
  const current = canonicalSettings();
  if (!Number.isFinite(updatedAt) || updatedAt < current.updatedAt) return current;
  return storeCanonicalSettings({ ...current, ...next, version: 1, updatedAt });
}

export function canonicalThemePreference(): CanonicalTheme {
  return canonicalSettings().theme;
}

export function applyCanonicalTheme(theme = canonicalThemePreference()) {
  const resolved = theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = theme;
}

export function setCanonicalTheme(theme: CanonicalTheme) {
  setCanonicalSettings({ theme });
}

export function installCanonicalTheme() {
  applyCanonicalTheme();
  const media = matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", () => {
    if (canonicalThemePreference() === "system") applyCanonicalTheme("system");
  });
  addEventListener("storage", (event) => {
    if (event.key === CANONICAL_THEME_KEY || event.key === CANONICAL_SETTINGS_KEY) applyCanonicalTheme();
  });
  addEventListener("brain-games-settings-change", () => applyCanonicalTheme());
}

export function canonicalHeader(options: {
  base: string;
  active: CanonicalView;
  profileLabel?: string;
  profileAriaLabel?: string;
}) {
  const link = (view: CanonicalView, label: string, suffix = "") => {
    const href = view === "home" ? options.base : `${options.base}?view=${view}${suffix}`;
    const current = options.active === view;
    return `<a href="${href}" data-shell-view="${view}" class="${current ? "active" : ""}" ${current ? 'aria-current="page"' : ""}>${label}</a>`;
  };
  const profileLabel = escapeHtml(options.profileLabel || "Profile");
  const profileAriaLabel = escapeHtml(options.profileAriaLabel || "Manage Brain Games profile");
  return `<header class="shell-header">
    <a class="shell-brand" href="${options.base}" data-shell-view="home" aria-label="Brain Games home"><span aria-hidden="true">B</span><strong>Brain Games</strong></a>
    <nav class="shell-nav" aria-label="Brain Games">
      ${link("home", "Home")}
      ${link("play", "Play")}
      ${link("progress", "Progress")}
      ${link("settings", "Settings")}
    </nav>
    <a class="shell-profile" href="${options.base}?view=settings" data-shell-view="settings" aria-label="${profileAriaLabel}"><i aria-hidden="true"></i><span>${profileLabel}</span></a>
  </header>`;
}
