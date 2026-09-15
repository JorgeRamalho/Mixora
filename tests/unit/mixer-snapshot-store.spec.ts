import { describe, expect, it } from "vitest";
import {
  notifyMixerSnapshotChange,
  subscribeMixerSnapshot,
} from "../../src/lib/mixer-snapshot-store";

describe("mixer-snapshot-store", () => {
  it("notifica inscritos após refresh do snapshot", () => {
    let calls = 0;
    const unsubscribe = subscribeMixerSnapshot(() => {
      calls += 1;
    });

    notifyMixerSnapshotChange();
    notifyMixerSnapshotChange();

    unsubscribe();
    notifyMixerSnapshotChange();

    expect(calls).toBe(2);
  });
});
