export const themeChoices = ["light", "dark"] as const;
export type ThemeChoice = (typeof themeChoices)[number];

export const themeStorageKey = "dispatch-theme";

export const themeLabels: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
};

export function parseTheme(stored: string | null): ThemeChoice | null {
  return themeChoices.find((choice) => choice === stored) ?? null;
}

export function resolveTheme(stored: string | null, devicePrefersDark: boolean): ThemeChoice {
  return parseTheme(stored) ?? (devicePrefersDark ? "dark" : "light");
}

export function nextTheme(theme: ThemeChoice): ThemeChoice {
  return theme === "dark" ? "light" : "dark";
}
