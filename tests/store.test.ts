import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDemoCase } from "../server/demo-data.js";
import { FilePPAPStore, resetDefaultStore } from "../server/store.js";
import { AppError } from "../server/types.js";

describe("PPAPStore persistence", () => {
  let dir: string;
  let store: FilePPAPStore;

  afterEach(async () => {
    resetDefaultStore();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  async function makeStore() {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ppap-store-"));
    store = new FilePPAPStore(path.join(dir, "ppap-cases.json"));
    return store;
  }

  it("creates and retrieves a case with traceability", async () => {
    const s = await makeStore();
    await s.createCase(createDemoCase());
    const loaded = await s.getCase("PP-10482");
    expect(loaded?.documents).toHaveLength(12);
    expect(loaded?.findings).toHaveLength(6);
    expect(loaded?.processTraceability.some((p) => p.operationId === "OP40")).toBe(
      true,
    );
    expect(loaded?.characteristicTraceability[0]?.id).toBe("CC-07");
  });

  it("rejects duplicate case creation", async () => {
    const s = await makeStore();
    await s.createCase(createDemoCase());
    await expect(s.createCase(createDemoCase())).rejects.toMatchObject({
      code: "CASE_ALREADY_EXISTS",
    });
  });

  it("reloads persisted cases from disk", async () => {
    const s = await makeStore();
    await s.createCase(createDemoCase());
    const reloaded = new FilePPAPStore(path.join(dir, "ppap-cases.json"));
    await reloaded.reload();
    expect((await reloaded.getCase("PP-10482"))?.supplier.name).toContain(
      "Mechatronik",
    );
  });

  it("lists cases", async () => {
    const s = await makeStore();
    await s.createCase(createDemoCase());
    expect(await s.listCases()).toHaveLength(1);
  });

  it("throws on update of missing case", async () => {
    const s = await makeStore();
    await expect(s.updateCase("MISSING", (c) => c)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
