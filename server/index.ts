import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { mcpAuthMiddleware } from "./auth.js";
import {
  createMcpServer,
  ensureDemoCase,
  SERVICE_VERSION,
} from "./mcp.js";
import { getStore } from "./store.js";

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const store = getStore();
  await ensureDemoCase(store);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "ppap-review-mcp",
      version: SERVICE_VERSION,
    });
  });

  app.use("/mcp", mcpAuthMiddleware);

  // Stateless Streamable HTTP — one server+transport per request (Langdock-compatible).
  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createMcpServer(store);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`ppap-review-mcp listening on http://0.0.0.0:${port}`);
    console.log(`  Health: http://localhost:${port}/health`);
    console.log(`  MCP:    http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
