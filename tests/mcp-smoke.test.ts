import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import type { Server } from "node:http";
import { createDemoCase } from "../server/demo-data.js";
import { createMcpServer, WORKBENCH_URI } from "../server/mcp.js";
import { FilePPAPStore } from "../server/store.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";

describe("MCP integration smoke", () => {
  let server: Server;
  let baseUrl: string;
  let dataDir: string;

  beforeAll(async () => {
    // Ensure UI artifact exists for resource read
    const distCandidates = [
      path.resolve("dist/ui/index.html"),
      path.resolve("dist/index.html"),
    ];
    let hasHtml = false;
    for (const htmlPath of distCandidates) {
      try {
        await fs.access(htmlPath);
        hasHtml = true;
        break;
      } catch {
        // continue
      }
    }
    if (!hasHtml) {
      const distDir = path.resolve("dist/ui");
      await fs.mkdir(distDir, { recursive: true });
      await fs.writeFile(
        path.join(distDir, "index.html"),
        "<!DOCTYPE html><html><body><div id='root'>PPAP Review Workbench</div></body></html>",
        "utf-8",
      );
    }

    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ppap-smoke-"));
    const store = new FilePPAPStore(path.join(dataDir, "ppap-cases.json"));
    await store.createCase(createDemoCase());

    const app = createMcpExpressApp({ host: "127.0.0.1" });
    app.all("/mcp", async (req: Request, res: Response) => {
      const mcp = createMcpServer(store);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => {
        transport.close().catch(() => {});
        mcp.close().catch(() => {});
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("No port");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("lists tools, serves UI resource, opens workbench, and records decision", async () => {
    const client = new Client({ name: "ppap-smoke", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp`),
    );
    await client.connect(transport);

    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain("open_ppap_workbench");
    expect(names).toContain("create_ppap_case");
    expect(names).toContain("set_finding_decision");

    const openTool = tools.tools.find((t) => t.name === "open_ppap_workbench");
    expect(openTool?._meta?.ui).toMatchObject({
      resourceUri: WORKBENCH_URI,
    });

    const resource = await client.readResource({ uri: WORKBENCH_URI });
    const html = resource.contents[0];
    expect(html).toBeTruthy();
    if (html && "text" in html) {
      expect(html.mimeType).toBe(RESOURCE_MIME_TYPE);
      expect(html.text).toContain("<html");
    }

    const opened = await client.callTool({
      name: "open_ppap_workbench",
      arguments: { caseId: "PP-10482" },
    });
    expect(opened.isError).toBeFalsy();
    expect(opened.structuredContent).toMatchObject({
      case: { caseId: "PP-10482" },
    });

    const decision = await client.callTool({
      name: "set_finding_decision",
      arguments: {
        caseId: "PP-10482",
        findingId: "F-001",
        decision: "SUPPLIER_CLARIFICATION",
        comment: "Please submit a PSW matching the current drawing revision.",
      },
    });
    expect(decision.isError).toBeFalsy();
    expect(decision.structuredContent).toMatchObject({
      success: true,
      decision: "SUPPLIER_CLARIFICATION",
    });

    const fetched = await client.callTool({
      name: "get_ppap_case",
      arguments: { caseId: "PP-10482" },
    });
    const caseData = fetched.structuredContent as {
      findings: { id: string; sqeDecision?: string }[];
    };
    const f001 = caseData.findings.find((f) => f.id === "F-001");
    expect(f001?.sqeDecision).toBe("SUPPLIER_CLARIFICATION");

    await client.close();
  });
});
