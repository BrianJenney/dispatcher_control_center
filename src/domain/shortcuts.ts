export const shortcutsStorageKey = "dispatch-shortcuts";

export const chordTimeoutMs = 1500;

export type ShortcutHref = "/" | "/jobs" | "/jobs/new" | "/schedule" | "/drivers" | "/fleet" | "/insights" | "/activity";

export type ShortcutAction =
  | { kind: "go"; href: ShortcutHref }
  | { kind: "search" }
  | { kind: "help" }
  | { kind: "trip"; step: 1 | -1 };

export type ShortcutGroup = "Go to" | "Trips" | "General";

export type Shortcut = {
  keys: readonly string[];
  label: string;
  group: ShortcutGroup;
  action: ShortcutAction;
};

export const shortcuts: readonly Shortcut[] = [
  { keys: ["g", "d"], label: "Dashboard", group: "Go to", action: { kind: "go", href: "/" } },
  { keys: ["g", "j"], label: "Jobs", group: "Go to", action: { kind: "go", href: "/jobs" } },
  { keys: ["g", "s"], label: "Schedule", group: "Go to", action: { kind: "go", href: "/schedule" } },
  { keys: ["g", "r"], label: "Drivers", group: "Go to", action: { kind: "go", href: "/drivers" } },
  { keys: ["g", "f"], label: "Fleet", group: "Go to", action: { kind: "go", href: "/fleet" } },
  { keys: ["g", "i"], label: "Insights", group: "Go to", action: { kind: "go", href: "/insights" } },
  { keys: ["g", "a"], label: "Activity log", group: "Go to", action: { kind: "go", href: "/activity" } },
  { keys: ["n"], label: "Book a new trip", group: "Trips", action: { kind: "go", href: "/jobs/new" } },
  { keys: ["j"], label: "Next trip card", group: "Trips", action: { kind: "trip", step: 1 } },
  { keys: ["k"], label: "Previous trip card", group: "Trips", action: { kind: "trip", step: -1 } },
  { keys: ["/"], label: "Search jobs", group: "General", action: { kind: "search" } },
  { keys: ["?"], label: "Show this list", group: "General", action: { kind: "help" } },
];

export const dismissShortcut = { keys: ["Esc"], label: "Close this window" };

export type ShortcutRow = { keys: readonly string[]; label: string };

const groupOrder: readonly ShortcutGroup[] = ["Go to", "Trips", "General"];

export function shortcutGroups(): { title: ShortcutGroup; rows: ShortcutRow[] }[] {
  return groupOrder.map((title) => ({
    title,
    rows: [
      ...shortcuts.filter((shortcut) => shortcut.group === title),
      ...(title === "General" ? [dismissShortcut] : []),
    ],
  }));
}

export function parseShortcutsEnabled(stored: string | null): boolean {
  return stored !== "off";
}

export type KeyPress = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean };

export type ChordState = { keys: readonly string[]; at: number };

export const idleChord: ChordState = { keys: [], at: 0 };

export type ChordResult = { state: ChordState; match: Shortcut | null };

const modifierKeys: readonly string[] = ["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock"];

function normalize(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function startsWith(keys: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length <= keys.length && prefix.every((key, index) => keys[index] === key);
}

export function pressKey(
  state: ChordState,
  press: KeyPress,
  now: number,
  available: readonly Shortcut[] = shortcuts,
): ChordResult {
  if (modifierKeys.includes(press.key)) return { state, match: null };
  if (press.ctrlKey || press.metaKey || press.altKey) return { state: idleChord, match: null };
  const waiting = state.keys.length > 0 && now - state.at <= chordTimeoutMs;
  const sequence = [...(waiting ? state.keys : []), normalize(press.key)];
  const match = available.find((shortcut) => shortcut.keys.length === sequence.length && startsWith(shortcut.keys, sequence));
  if (match) return { state: idleChord, match };
  const pending = available.some((shortcut) => startsWith(shortcut.keys, sequence));
  if (!pending) return { state: idleChord, match: null };
  return { state: { keys: sequence, at: now }, match: null };
}

export function stepIndex(current: number, count: number, step: 1 | -1): number {
  if (count === 0) return -1;
  if (current < 0) return step === 1 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, current + step));
}
