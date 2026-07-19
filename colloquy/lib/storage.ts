import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { RunSchema, type Run } from "../schemas/run";

/**
 * Storage boundary. v1 persists JSON files under ./runs/; a database
 * implementation can drop in behind this interface without touching the
 * orchestrator or routes.
 */
export interface StorageAdapter {
  saveRun(run: Run): Promise<void>;
  getRun(id: string): Promise<Run | null>;
  listRunIds(): Promise<string[]>;
}

export class FileStorageAdapter implements StorageAdapter {
  constructor(
    private readonly dir: string = process.env.COLLOQUY_RUNS_DIR?.trim() ||
      path.join(process.cwd(), "runs"),
  ) {}

  private fileFor(id: string): string {
    // Run ids are generated server-side, but never trust them as paths.
    const safe = path.basename(id);
    if (safe !== id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid run id: ${id}`);
    }
    return path.join(this.dir, `${safe}.json`);
  }

  async saveRun(run: Run): Promise<void> {
    RunSchema.parse(run);
    await mkdir(this.dir, { recursive: true });
    const file = this.fileFor(run.id);
    // Write-then-rename so a crash mid-write never corrupts a transcript.
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(run, null, 2), "utf8");
    await rename(tmp, file);
  }

  async getRun(id: string): Promise<Run | null> {
    try {
      const raw = await readFile(this.fileFor(id), "utf8");
      return RunSchema.parse(JSON.parse(raw));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async listRunIds(): Promise<string[]> {
    try {
      const entries = await readdir(this.dir);
      return entries
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length))
        .sort();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }
}

export function getStorage(): StorageAdapter {
  return new FileStorageAdapter();
}
