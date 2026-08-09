# PPAP Review Workbench (MCP App)

Deterministic Supplier Quality Engineer review workbench delivered as a genuine **MCP server + MCP App UI** for Langdock.

This is **not** a standalone dashboard. Langdock hosts the conversation and agent reasoning; this project stores structured PPAP case state and renders an interactive review UI via MCP Apps (`ui://ppap-review/workbench.html`).

## What this project is

| Role | Responsibility |
|------|----------------|
| **Langdock Agent** | Document intelligence/reasoning: classify, extract, compare, draft preliminary findings |
| **PPAP MCP Server** | Authoritative state + tools (`create_ppap_case`, decisions, summary, …) |
| **PPAP MCP App** | Interactive SQE review UI rendered inside Langdock |
| **Human SQE** | Final decision authority — no autonomous approve/reject |

There are **no LLM API calls** inside this MCP project.

## Architecture

```
Supplier PPAP Files
        |
        v
Langdock PPAP Agent
        |
        | create_ppap_case
        v
PPAP MCP Server
        |
        | open_ppap_workbench
        v
ui://ppap-review/workbench.html
        |
        v
Langdock embedded MCP App
        |
        | SQE decision
        v
set_finding_decision
        |
        v
MCP Server
        |
        v
Langdock follow-up
```

## Local development

```bash
cd ppap-review-mcp
npm install
npm run build
npm run serve
```

- Health: http://localhost:3001/health
- MCP: http://localhost:3001/mcp

Useful scripts:

```bash
npm run dev          # watch UI + server
npm run dev:ui       # mock browser preview (VITE_MOCK_MODE=true)
npm run typecheck
npm run test
npm run test:smoke
```

Demo case `PP-10482` is seeded automatically on server start.

### Mock UI preview

```bash
npm run dev:ui
```

Shows a **Mock Development Mode** badge and loads the seeded case without an MCP host. Production builds do not enable this by default.

## Free hosting (recommended: Render)

Use **Render Free Web Service** for a public HTTPS MCP URL Langdock can reach.

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign up (GitHub login).
2. **New → Web Service**
3. Connect repo: `AdarshRajDS/ppap-review-mcp`
4. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build:ui`
   - **Start Command:** `npx tsx server/index.ts`
   - **Instance type:** Free
   - **Health Check Path:** `/health`
5. Deploy. Your URL will look like:
   `https://ppap-review-mcp.onrender.com`
6. In Langdock → Integrations → MCP, enter:
   `https://ppap-review-mcp.onrender.com/mcp`
   Auth: **No Authentication** (unless you set `MCP_API_KEY`)

Notes:
- Free tier sleeps after ~15 minutes idle; the first request can take 30–60s to wake.
- Netlify is only for static UI preview — do **not** use the Netlify URL in Langdock.

## Public testing / tunnels

For quick local testing without Render, expose the local server with any temporary HTTPS tunnel (ngrok, Cloudflare Tunnel, localtunnel, etc.):

```bash
npm run serve
# then tunnel port 3001 → HTTPS
```

Example result:

```text
https://example-public-host/mcp
```

## Langdock setup

1. Deploy/expose the MCP server through HTTPS.
2. Open Langdock workspace settings.
3. Go to **Integrations**.
4. Add an **MCP integration**.
5. Enter: `https://YOUR_HOST/mcp`
6. Choose **No Authentication** for local/demo use, **or** API Key / Bearer auth when `MCP_API_KEY` is set.
7. Test the connection.
8. Enable these tools:
   - `create_ppap_case`
   - `update_ppap_case`
   - `get_ppap_case`
   - `open_ppap_workbench`
   - `set_finding_decision`
   - `add_finding_comment`
   - `set_review_status`
   - `get_review_summary`
9. Add the MCP integration/actions to the PPAP Review Agent.
10. In the Agent instructions, tell the Agent to:
    - create/update the PPAP case after analysis
    - then call `open_ppap_workbench`
    - use the returned human review state for later supplier communication

### Exact connection URL format

```text
https://YOUR_HOST/mcp
```

Local:

```text
http://localhost:3001/mcp
```

### Suggested test phrase

> Review this PPAP submission. After analysis, create the PPAP case and open the PPAP Review Workbench for human SQE review.

## Demo flow

1. User: **"Review this PPAP submission."**
2. Langdock analyzes documents.
3. Langdock calls `create_ppap_case` with case `PP-10482` (or equivalent structured payload).
4. Langdock calls:

```json
{ "caseId": "PP-10482" }
```

via `open_ppap_workbench`.

5. The MCP App opens inside Langdock.
6. SQE opens **F-001**, compares Drawing Revision **C** vs PSW Revision **B**.
7. SQE selects **Supplier Clarification** and comments:  
   `"Please submit a PSW matching the current drawing revision."`
8. UI calls `set_finding_decision` through the MCP Apps bridge (not `fetch` to localhost).
9. User returns to chat:  
   **"Prepare the supplier clarification email for everything I marked."**
10. Langdock reasons over the human-reviewed case and drafts the email.

## Security

- Set `MCP_API_KEY` to require `Authorization: Bearer <key>` on `/mcp`.
- Do not expose the API key to the React UI.
- Treat all PPAP payloads as confidential business data.
- No secrets are returned to the UI.

## Docker

```bash
docker build -t ppap-review-mcp .
docker run --rm -p 3001:3001 -v ppap-data:/app/data -e PORT=3001 ppap-review-mcp
```

Optional auth:

```bash
docker run --rm -p 3001:3001 -e MCP_API_KEY=your-secret ppap-review-mcp
```

## Environment

See `.env.example`:

```bash
PORT=3001
MCP_API_KEY=
DATA_DIR=./data
NODE_ENV=development
VITE_MOCK_MODE=false
```

## Project layout

```text
ppap-review-mcp/
  server/          MCP + Express + persistence + tools
  ui/              React MCP App (single-file Vite build)
  data/            Local JSON store (server-authoritative)
  tests/           Unit + MCP smoke tests
```
