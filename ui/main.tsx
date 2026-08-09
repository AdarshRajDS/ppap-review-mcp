import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { App } from "./App.tsx";
import { parseToolResult } from "./mcp-client.ts";
import type { PPAPCase, ReviewSummary } from "./types.ts";
import { createDemoCase } from "../server/demo-data.ts";
import { buildReviewSummary } from "../server/tools/helpers.ts";
import "./styles.css";

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

function MockWorkbench() {
  const demo = createDemoCase();
  return (
    <App
      app={null}
      initialCase={demo}
      initialSummary={buildReviewSummary(demo)}
      mockMode
    />
  );
}

function HostWorkbench() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [ppapCase, setPpapCase] = useState<PPAPCase | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | undefined>();

  const { app, error } = useApp({
    appInfo: { name: "PPAP Review Workbench", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (created) => {
      // Handlers must be registered before connect (useApp does this).
      created.ontoolresult = (result) => {
        setToolResult(result);
      };
      created.onerror = (err) => {
        console.error(err);
      };
    },
  });

  useEffect(() => {
    if (!toolResult) return;
    const parsed = parseToolResult(toolResult);
    if (!parsed) {
      setParseError(
        "Could not parse the initial open_ppap_workbench tool result.",
      );
      return;
    }
    setParseError(null);
    setPpapCase(parsed.case);
    setSummary(parsed.reviewSummary ?? buildReviewSummary(parsed.case));
  }, [toolResult]);

  if (error) {
    return (
      <div className="state-screen">
        <div className="panel">
          <h2>Connection error</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="state-screen">
        <div className="panel">
          <h2>Unable to load workbench</h2>
          <p>{parseError}</p>
        </div>
      </div>
    );
  }

  if (!app || !ppapCase) {
    return (
      <div className="state-screen">
        <div className="panel">
          <h2>PPAP Review Workbench</h2>
          <p className="muted">Waiting for case data from the MCP host…</p>
        </div>
      </div>
    );
  }

  return <App app={app} initialCase={ppapCase} initialSummary={summary} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {MOCK_MODE ? <MockWorkbench /> : <HostWorkbench />}
  </StrictMode>,
);
