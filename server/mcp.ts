import fs from "node:fs/promises";
import path from "node:path";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createDemoCase } from "./demo-data.js";
import {
  CreatePpapCaseInputSchema,
  ReviewStatusSchema,
  SqeDecisionSchema,
} from "./schemas.js";
import { getStore, type PPAPStore } from "./store.js";
import { AppError } from "./types.js";
import { createPpapCase } from "./tools/create-ppap-case.js";
import { updatePpapCase } from "./tools/update-ppap-case.js";
import { getPpapCase } from "./tools/get-ppap-case.js";
import { openPpapWorkbench } from "./tools/open-ppap-workbench.js";
import { setFindingDecision } from "./tools/set-finding-decision.js";
import { addFindingComment } from "./tools/add-finding-comment.js";
import { setReviewStatus } from "./tools/set-review-status.js";
import { getReviewSummary } from "./tools/get-review-summary.js";

export const WORKBENCH_URI = "ui://ppap-review/workbench.html";
export const SERVICE_VERSION = "1.0.0";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "..", "dist")
  : path.join(import.meta.dirname, "..", "dist");

function toolError(error: unknown) {
  if (error instanceof AppError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: error.code, message: error.message }),
        },
      ],
      isError: true as const,
    };
  }
  console.error("Unhandled tool error:", error);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: "PERSISTENCE_ERROR",
          message: "An internal error occurred.",
        }),
      },
    ],
    isError: true as const,
  };
}

export async function ensureDemoCase(store: PPAPStore): Promise<void> {
  const existing = await store.getCase("PP-10482");
  if (!existing) {
    try {
      await store.createCase(createDemoCase());
    } catch (error) {
      if (!(error instanceof AppError && error.code === "CASE_ALREADY_EXISTS")) {
        throw error;
      }
    }
  }
}

/**
 * Creates an MCP server instance with all PPAP review tools and the workbench UI resource.
 */
export function createMcpServer(store: PPAPStore = getStore()): McpServer {
  const server = new McpServer({
    name: "ppap-review-mcp",
    version: SERVICE_VERSION,
  });

  server.registerTool(
    "create_ppap_case",
    {
      title: "Create PPAP Case",
      description:
        "Create a structured PPAP case after Langdock has analyzed supplier PPAP documents. Do not call this to overwrite an existing case — use update_ppap_case instead. This tool does not render UI.",
      inputSchema: {
        case: CreatePpapCaseInputSchema.shape.case,
      },
    },
    async (args) => {
      try {
        return await createPpapCase(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "update_ppap_case",
    {
      title: "Update PPAP Case",
      description:
        "Safely update an existing PPAP case when revised supplier evidence or new automated findings are available. Preserves SQE decisions, comments, and audit history.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
        patch: z.record(z.string(), z.unknown()),
      },
    },
    async (args) => {
      try {
        return await updatePpapCase(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_ppap_case",
    {
      title: "Get PPAP Case",
      description:
        "Return the complete normalized PPAP case for a given caseId, including findings, evidence, traceability, SQE decisions, and audit trail.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
      },
    },
    async (args) => {
      try {
        return await getPpapCase(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // Primary MCP App tool — associates the interactive workbench UI resource.
  registerAppTool(
    server,
    "open_ppap_workbench",
    {
      title: "Open PPAP Review Workbench",
      description:
        "Open the interactive Supplier Quality Engineer PPAP review workbench for an existing PPAP case. Use this after the PPAP case has been created and automated findings are ready for human review.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
      },
      _meta: {
        ui: { resourceUri: WORKBENCH_URI },
      },
    },
    async (args) => {
      try {
        return await openPpapWorkbench(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerAppTool(
    server,
    "set_finding_decision",
    {
      title: "Set Finding Decision",
      description:
        "Record an SQE human decision on a PPAP finding. Allowed decisions: ACCEPT_FINDING, FALSE_POSITIVE, SUPPLIER_CLARIFICATION, INTERNAL_REVIEW, NOT_APPLICABLE, RESOLVED. Does not approve or reject the overall PPAP.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
        findingId: z.string().min(1).max(128),
        decision: SqeDecisionSchema,
        reviewer: z.string().max(256).optional(),
        comment: z.string().max(2000).optional(),
      },
      _meta: {
        ui: {
          resourceUri: WORKBENCH_URI,
          visibility: ["model", "app"],
        },
      },
    },
    async (args) => {
      try {
        return await setFindingDecision(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerAppTool(
    server,
    "add_finding_comment",
    {
      title: "Add Finding Comment",
      description:
        "Add an SQE comment to a PPAP finding. Empty comments are rejected. Creates an audit event.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
        findingId: z.string().min(1).max(128),
        comment: z.string().min(1).max(2000),
        reviewer: z.string().max(256).optional(),
      },
      _meta: {
        ui: {
          resourceUri: WORKBENCH_URI,
          visibility: ["model", "app"],
        },
      },
    },
    async (args) => {
      try {
        return await addFindingComment(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "set_review_status",
    {
      title: "Set Review Status",
      description:
        "Update the human review workflow status. Supported: INITIAL_REVIEW, IN_REVIEW, SUPPLIER_CLARIFICATION_REQUIRED, INTERNAL_REVIEW_REQUIRED, READY_FOR_DISPOSITION, COMPLETED. There is no AI_APPROVED or AI_REJECTED status — final PPAP disposition remains with the authorised SQE.",
      inputSchema: {
        caseId: z.string().min(1).max(128),
        status: ReviewStatusSchema,
        reviewer: z.string().max(256).optional(),
      },
    },
    async (args) => {
      try {
        return await setReviewStatus(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_review_summary",
    {
      title: "Get Review Summary",
      description:
        "Return a compact human-review summary for a PPAP case including finding counts by category, traceability gaps, and suggested operational status based purely on current state (not AI).",
      inputSchema: {
        caseId: z.string().min(1).max(128),
      },
    },
    async (args) => {
      try {
        return await getReviewSummary(store, args);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerAppResource(
    server,
    "PPAP Review Workbench",
    WORKBENCH_URI,
    {
      description:
        "Interactive Supplier Quality Engineer PPAP review workbench UI.",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {
      // Prefer workbench.html; fall back to index.html from Vite singlefile build.
      const candidates = [
        path.join(DIST_DIR, "ui", "index.html"),
        path.join(DIST_DIR, "workbench.html"),
        path.join(DIST_DIR, "index.html"),
      ];
      let html: string | undefined;
      for (const candidate of candidates) {
        try {
          html = await fs.readFile(candidate, "utf-8");
          break;
        } catch {
          // try next
        }
      }
      if (!html) {
        throw new Error(
          "Workbench UI not built. Run npm run build before serving.",
        );
      }
      return {
        contents: [
          {
            uri: WORKBENCH_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );

  return server;
}
