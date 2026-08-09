import type { Request, Response, NextFunction } from "express";

/**
 * Optional Bearer auth for /mcp when MCP_API_KEY is configured.
 * When unset, development use is allowed without authentication.
 */
export function mcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = process.env.MCP_API_KEY?.trim();
  if (!apiKey) {
    next();
    return;
  }

  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();

  if (!token || token !== apiKey) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }

  next();
}
