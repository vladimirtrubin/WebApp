import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FileStorageAdapter } from "../lib/storage";
import type { Run } from "../schemas/run";

function makeRun(id: string, overrides: Partial<Run> = {}): Run {
  return {
    id,
    topic: "Is it ever righteous to lie?",
    model: "claude-opus-4-8",
    createdAt: new Date("2026-07-19T00:00:00Z").toISOString(),
    status: "completed",
    maxRounds: 4,
    agents: [
      {
        id: "a1",
        name: "Agent One",
        era: "Contemporary",
        school: "Test school",
        accentColor: "#123456",
        isLiving: false,
      },
      {
        id: "a2",
        name: "Agent Two",
        era: "Contemporary",
        school: "Test school",
        accentColor: "#654321",
        isLiving: false,
      },
    ],
    analyses: [],
    rounds: [],
    verdict: null,
    error: null,
    ...overrides,
  };
}

describe("FileStorageAdapter", () => {
  let dir: string;
  let storage: FileStorageAdapter;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "colloquy-storage-"));
    storage = new FileStorageAdapter(dir);
  });

  it("round-trips a run through save and get", async () => {
    const run = makeRun("run_abc");
    await storage.saveRun(run);
    expect(await storage.getRun("run_abc")).toEqual(run);
  });

  it("returns null for a missing run and [] for an empty directory", async () => {
    expect(await storage.getRun("run_missing")).toBeNull();
    expect(await storage.listRunIds()).toEqual([]);
  });

  it("lists saved run ids, ignoring non-JSON files", async () => {
    await storage.saveRun(makeRun("run_b"));
    await storage.saveRun(makeRun("run_a"));
    await writeFile(path.join(dir, ".gitkeep"), "");
    expect(await storage.listRunIds()).toEqual(["run_a", "run_b"]);
  });

  it("overwrites atomically — no leftover temp files", async () => {
    const run = makeRun("run_atomic");
    await storage.saveRun(run);
    await storage.saveRun({ ...run, status: "adjourned" });
    expect((await storage.getRun("run_atomic"))?.status).toBe("adjourned");
    const files = await readdir(dir);
    expect(files.filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("rejects path-traversal-shaped ids", async () => {
    await expect(storage.saveRun(makeRun("../evil"))).rejects.toThrow(/Invalid run id/);
    await expect(storage.getRun("a/b")).rejects.toThrow(/Invalid run id/);
  });

  it("refuses to persist an envelope that fails the Run schema", async () => {
    const bad = { ...makeRun("run_bad"), status: "paused" } as unknown as Run;
    await expect(storage.saveRun(bad)).rejects.toThrow();
  });
});
