import { describe, expect, it } from "vitest";
import { activityFilter, activityPage, describeActivity, type ActivityEntry, type MoveEntry } from "@/domain/activity";
import { maxShown, pageSize } from "@/domain/paging";

const format = { money: (cents: number) => `$${(cents / 100).toFixed(2)}`, moment: (iso: string) => iso };

const base = {
  createdAt: "2026-10-09T15:30:00.000Z",
  historyOrder: 1,
  actorName: "Dana Reyes",
  tripId: "00000000-0000-4000-8000-000000000001",
  reference: 1042,
  customerName: "Arden Ashdown",
};

function move(overrides: Partial<MoveEntry>): ActivityEntry {
  return {
    ...base,
    id: "00000000-0000-4000-8000-0000000000a1",
    kind: "move",
    fromStatus: null,
    toStatus: "offer",
    fromDriverName: null,
    toDriverName: null,
    reason: null,
    ...overrides,
  };
}

describe("describeActivity", () => {
  it.each<[Partial<MoveEntry>, string]>([
    [{ fromStatus: null, toStatus: "offer" }, "booked trip #1042"],
    [{ fromStatus: "offer", toStatus: "assigned", toDriverName: "Ana Ruiz" }, "assigned trip #1042 to Ana Ruiz"],
    [
      { fromStatus: "assigned", toStatus: "assigned", fromDriverName: "Ana Ruiz", toDriverName: "Ben Okafor" },
      "reassigned trip #1042 from Ana Ruiz to Ben Okafor",
    ],
    [{ fromStatus: "assigned", toStatus: "en_route", fromDriverName: "Ana Ruiz", toDriverName: "Ana Ruiz" }, "started trip #1042"],
    [{ fromStatus: "en_route", toStatus: "completed" }, "completed trip #1042"],
    [{ fromStatus: "offer", toStatus: "cancelled" }, "cancelled trip #1042"],
    [{ fromStatus: "assigned", toStatus: "cancelled", reason: "Client called" }, "cancelled trip #1042: Client called"],
  ])("describes the move %j", (overrides, expected) => {
    expect(describeActivity(move(overrides), format)).toBe(expected);
  });

  it.each<[Partial<MoveEntry>, string]>([
    [{ fromStatus: "offer", toStatus: "assigned" }, "assigned a driver to trip #1042"],
    [{ fromStatus: "assigned", toStatus: "assigned", reason: "Reassigned to another driver" }, "changed the driver on trip #1042"],
    [{ fromStatus: "assigned", toStatus: "assigned", toDriverName: "Ben Okafor" }, "changed the driver on trip #1042"],
  ])("keeps entries written before drivers were recorded readable: %j", (overrides, expected) => {
    expect(describeActivity(move(overrides), format)).toBe(expected);
  });

  it("ignores a reason on moves that are not cancellations", () => {
    expect(describeActivity(move({ fromStatus: "assigned", toStatus: "en_route", reason: "Stale" }), format)).toBe(
      "started trip #1042",
    );
  });

  it("describes a detail edit with its old and new value", () => {
    const entry: ActivityEntry = {
      ...base,
      id: "00000000-0000-4000-8000-0000000000b1",
      kind: "edit",
      edit: { field: "fare_cents", from: 18_000, to: 21_000 },
    };
    expect(describeActivity(entry, format)).toBe("changed the fare on trip #1042 from $180.00 to $210.00");
  });
});

describe("activityPage", () => {
  const at = (minute: number, id: string) =>
    move({
      createdAt: `2026-10-09T15:${String(minute).padStart(2, "0")}:00.000Z`,
      id: `00000000-0000-4000-8000-00000000000${id}`,
      historyOrder: Number(id),
    });

  it("puts the newest entries first across moves and edits", () => {
    const edit: ActivityEntry = { ...base, id: "00000000-0000-4000-8000-0000000000c1", createdAt: "2026-10-09T15:20:00.000Z", kind: "edit", edit: { field: "passengers", from: 1, to: 2 } };
    const page = activityPage([at(10, "1"), edit, at(30, "2")], 25);
    expect(page.entries.map((entry) => entry.id)).toEqual([at(30, "2").id, edit.id, at(10, "1").id]);
    expect(page.hasMore).toBe(false);
  });

  it("breaks ties on the same moment by the order entries were recorded, latest first", () => {
    const booked = move({ id: "00000000-0000-4000-8000-0000000000f1", historyOrder: 1, toStatus: "offer" });
    const assigned = move({ id: "00000000-0000-4000-8000-0000000000a2", historyOrder: 2, toStatus: "assigned" });
    const edited: ActivityEntry = { ...base, id: "00000000-0000-4000-8000-0000000000e3", historyOrder: 3, kind: "edit", edit: { field: "passengers", from: 1, to: 2 } };
    const started = move({ id: "00000000-0000-4000-8000-0000000000b4", historyOrder: 4, toStatus: "en_route" });
    const page = activityPage([assigned, started, booked, edited], 25);
    expect(page.entries.map((entry) => entry.historyOrder)).toEqual([4, 3, 2, 1]);
  });

  it("keeps the requested number and says when more remain", () => {
    const page = activityPage([at(1, "1"), at(2, "2"), at(3, "3")], 2);
    expect(page.entries.map((entry) => entry.id.at(-1))).toEqual(["3", "2"]);
    expect(page.hasMore).toBe(true);
    expect(activityPage([at(1, "1"), at(2, "2")], 2).hasMore).toBe(false);
  });
});

describe("activityFilter", () => {
  it("defaults to the first page", () => {
    expect(activityFilter.parse({}).show).toBe(pageSize);
  });

  it("keeps sensible sizes and falls back on nonsense", () => {
    expect(activityFilter.parse({ show: "50" }).show).toBe(50);
    expect(activityFilter.parse({ show: "5" }).show).toBe(pageSize);
    expect(activityFilter.parse({ show: "9999" }).show).toBe(maxShown);
    expect(activityFilter.parse({ show: "abc" }).show).toBe(pageSize);
  });
});
