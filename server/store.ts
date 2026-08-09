import fs from "node:fs/promises";
import path from "node:path";
import { AppError, type PPAPCase } from "./types.js";
import { PPAPCaseSchema } from "./schemas.js";

export interface PPAPStore {
  createCase(ppapCase: PPAPCase): Promise<PPAPCase>;
  updateCase(caseId: string, updater: (current: PPAPCase) => PPAPCase): Promise<PPAPCase>;
  getCase(caseId: string): Promise<PPAPCase | undefined>;
  saveCase(ppapCase: PPAPCase): Promise<PPAPCase>;
  listCases(): Promise<PPAPCase[]>;
  reload(): Promise<void>;
}

interface StoreFile {
  cases: Record<string, PPAPCase>;
}

export class FilePPAPStore implements PPAPStore {
  private cases = new Map<string, PPAPCase>();
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as StoreFile;
      this.cases.clear();
      for (const [id, value] of Object.entries(parsed.cases ?? {})) {
        const result = PPAPCaseSchema.safeParse(value);
        if (result.success) {
          this.cases.set(id, result.data);
        } else {
          console.error(`Skipping invalid case ${id} during reload`);
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        this.cases.clear();
      } else {
        throw new AppError(
          "PERSISTENCE_ERROR",
          "Failed to load PPAP case store.",
        );
      }
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const payload: StoreFile = {
      cases: Object.fromEntries(this.cases.entries()),
    };
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const json = JSON.stringify(payload, null, 2);
    await fs.writeFile(tmp, json, "utf-8");
    await fs.rename(tmp, this.filePath);
  }

  private enqueuePersist(): Promise<void> {
    this.writeQueue = this.writeQueue
      .then(() => this.persist())
      .catch((error) => {
        console.error("Persist failed:", error);
        throw new AppError(
          "PERSISTENCE_ERROR",
          "Failed to persist PPAP case store.",
        );
      });
    return this.writeQueue;
  }

  async createCase(ppapCase: PPAPCase): Promise<PPAPCase> {
    await this.ensureLoaded();
    if (this.cases.has(ppapCase.caseId)) {
      throw new AppError(
        "CASE_ALREADY_EXISTS",
        `Case ${ppapCase.caseId} already exists. Use update_ppap_case instead.`,
      );
    }
    const validated = PPAPCaseSchema.parse(ppapCase);
    this.cases.set(validated.caseId, validated);
    await this.enqueuePersist();
    return structuredClone(validated);
  }

  async getCase(caseId: string): Promise<PPAPCase | undefined> {
    await this.ensureLoaded();
    const found = this.cases.get(caseId);
    return found ? structuredClone(found) : undefined;
  }

  async saveCase(ppapCase: PPAPCase): Promise<PPAPCase> {
    await this.ensureLoaded();
    const validated = PPAPCaseSchema.parse(ppapCase);
    this.cases.set(validated.caseId, validated);
    await this.enqueuePersist();
    return structuredClone(validated);
  }

  async updateCase(
    caseId: string,
    updater: (current: PPAPCase) => PPAPCase,
  ): Promise<PPAPCase> {
    await this.ensureLoaded();
    const current = this.cases.get(caseId);
    if (!current) {
      throw new AppError("CASE_NOT_FOUND", `Case ${caseId} was not found.`);
    }
    const next = updater(structuredClone(current));
    const validated = PPAPCaseSchema.parse(next);
    this.cases.set(caseId, validated);
    await this.enqueuePersist();
    return structuredClone(validated);
  }

  async listCases(): Promise<PPAPCase[]> {
    await this.ensureLoaded();
    return Array.from(this.cases.values()).map((c) => structuredClone(c));
  }
}

let defaultStore: FilePPAPStore | undefined;

export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "data");
}

export function getStore(filePath?: string): FilePPAPStore {
  if (filePath) {
    return new FilePPAPStore(filePath);
  }
  if (!defaultStore) {
    defaultStore = new FilePPAPStore(
      path.join(getDataDir(), "ppap-cases.json"),
    );
  }
  return defaultStore;
}

/** Test helper to reset the singleton store. */
export function resetDefaultStore(): void {
  defaultStore = undefined;
}
