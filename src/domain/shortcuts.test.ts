import { describe, expect, it } from "vitest";
import {
  chordTimeoutMs,
  idleChord,
  parseShortcutsEnabled,
  pressKey,
  shortcutGroups,
  shortcuts,
  stepIndex,
  type ChordState,
  type KeyPress,
} from "@/domain/shortcuts";

function press(key: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { key, ctrlKey: false, metaKey: false, altKey: false, ...modifiers };
}

function type(keys: string[], start: ChordState = idleChord, at = 1000) {
  let state = start;
  let match: string | null = null;
  for (const key of keys) {
    const result = pressKey(state, press(key), at);
    state = result.state;
    match = result.match ? result.match.label : null;
  }
  return { state, match };
}

describe("the shortcut list", () => {
  it("never has one shortcut that is the start of another", () => {
    for (const shortcut of shortcuts) {
      const clashes = shortcuts.filter(
        (other) =>
          other !== shortcut &&
          other.keys.length >= shortcut.keys.length &&
          shortcut.keys.every((key, index) => other.keys[index] === key),
      );
      expect(clashes, shortcut.label).toEqual([]);
    }
  });

  it("never repeats a key sequence", () => {
    const sequences = shortcuts.map((shortcut) => shortcut.keys.join(" "));
    expect(new Set(sequences).size).toBe(sequences.length);
  });

  it("groups every shortcut once and ends with the close key", () => {
    const groups = shortcutGroups();
    const labels = groups.flatMap((group) => group.rows.map((row) => row.label));
    for (const shortcut of shortcuts) expect(labels.filter((label) => label === shortcut.label)).toHaveLength(1);
    expect(groups.at(-1)?.rows.at(-1)?.keys).toEqual(["Esc"]);
  });
});

describe("pressKey with one key shortcuts", () => {
  it("matches a single key straight away", () => {
    expect(type(["n"]).match).toBe("Book a new trip");
    expect(type(["?"]).match).toBe("Show this list");
    expect(type(["/"]).match).toBe("Search jobs");
  });

  it("matches whatever the letter case, such as with caps lock on", () => {
    expect(type(["N"]).match).toBe("Book a new trip");
  });

  it("ignores keys that mean nothing", () => {
    expect(type(["x"])).toEqual({ state: idleChord, match: null });
    expect(type(["Enter"])).toEqual({ state: idleChord, match: null });
  });
});

describe("pressKey with two key chords", () => {
  it("waits after the first key", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    expect(first.match).toBeNull();
    expect(first.state).toEqual({ keys: ["g"], at: 1000 });
  });

  it("matches the chord on the second key and starts over", () => {
    const result = type(["g", "j"]);
    expect(result.match).toBe("Jobs");
    expect(result.state).toEqual(idleChord);
  });

  it("reaches every destination", () => {
    const destinations = shortcuts.filter((shortcut) => shortcut.keys.length === 2);
    for (const destination of destinations) expect(type([...destination.keys]).match).toBe(destination.label);
  });

  it("matches at exactly the timeout and gives up just after it", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    expect(pressKey(first.state, press("j"), 1000 + chordTimeoutMs).match?.label).toBe("Jobs");
    expect(pressKey(first.state, press("j"), 1000 + chordTimeoutMs + 1).match?.label).toBe("Next trip card");
  });

  it("treats a late second key as a fresh first key", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    const late = pressKey(first.state, press("d"), 1000 + chordTimeoutMs + 1);
    expect(late.match).toBeNull();
    expect(late.state).toEqual(idleChord);
  });

  it("resets on a wrong second key and does not act on it", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    const wrong = pressKey(first.state, press("x"), 1100);
    expect(wrong).toEqual({ state: idleChord, match: null });
    expect(pressKey(wrong.state, press("d"), 1200).match).toBeNull();
  });

  it("does not turn a wrong second key into a shortcut of its own", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    expect(pressKey(first.state, press("n"), 1100)).toEqual({ state: idleChord, match: null });
  });

  it("forgets a chord broken by pressing the first key twice", () => {
    const result = type(["g", "g", "j"]);
    expect(result.match).toBe("Next trip card");
  });

  it("starts a new chord right after finishing one", () => {
    expect(type(["g", "j", "g", "s"]).match).toBe("Schedule");
  });
});

describe("pressKey with modifier keys", () => {
  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])("never matches while %o is held", (modifiers) => {
    expect(pressKey(idleChord, press("n", modifiers), 1000)).toEqual({ state: idleChord, match: null });
    expect(pressKey(idleChord, press("g", modifiers), 1000).state).toEqual(idleChord);
  });

  it("cancels a waiting chord when a browser shortcut is used in between", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    expect(pressKey(first.state, press("j", { metaKey: true }), 1100)).toEqual({ state: idleChord, match: null });
  });

  it("lets the shift key itself pass without disturbing a waiting chord", () => {
    const first = pressKey(idleChord, press("g"), 1000);
    const shifted = pressKey(first.state, press("Shift"), 1100);
    expect(shifted.state).toEqual(first.state);
    expect(pressKey(shifted.state, press("j"), 1200).match?.label).toBe("Jobs");
  });

  it("still matches a key that needs shift to type, like the question mark", () => {
    expect(pressKey(idleChord, press("?"), 1000).match?.label).toBe("Show this list");
  });
});

describe("pressKey with a custom list", () => {
  it("only knows the shortcuts it is given", () => {
    expect(pressKey(idleChord, press("n"), 1000, []).match).toBeNull();
  });
});

describe("stepIndex", () => {
  it("starts at the first item going forward and the last going back", () => {
    expect(stepIndex(-1, 4, 1)).toBe(0);
    expect(stepIndex(-1, 4, -1)).toBe(3);
  });

  it("moves one at a time and stops at the ends", () => {
    expect(stepIndex(1, 4, 1)).toBe(2);
    expect(stepIndex(1, 4, -1)).toBe(0);
    expect(stepIndex(3, 4, 1)).toBe(3);
    expect(stepIndex(0, 4, -1)).toBe(0);
  });

  it("has nowhere to go with nothing to move through", () => {
    expect(stepIndex(-1, 0, 1)).toBe(-1);
    expect(stepIndex(2, 0, -1)).toBe(-1);
  });
});

describe("parseShortcutsEnabled", () => {
  it("is on unless it was switched off", () => {
    expect(parseShortcutsEnabled(null)).toBe(true);
    expect(parseShortcutsEnabled("on")).toBe(true);
    expect(parseShortcutsEnabled("off")).toBe(false);
  });
});
