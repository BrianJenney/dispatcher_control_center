export const themeChoices = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof themeChoices)[number];

export const themeStorageKey = "dispatch-theme";

export const themeLabels: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match my device",
};

export function parseTheme(stored: string | null): ThemeChoice {
  return themeChoices.find((choice) => choice === stored) ?? "system";
}

export function isDark(choice: ThemeChoice, systemPrefersDark: boolean): boolean {
  return choice === "dark" || (choice === "system" && systemPrefersDark);
}

export function nextTheme(choice: ThemeChoice): ThemeChoice {
  const index = themeChoices.indexOf(choice);
  return themeChoices[(index + 1) % themeChoices.length] ?? "system";
}
