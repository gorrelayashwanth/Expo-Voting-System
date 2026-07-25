import { defineTool } from "@lovable.dev/mcp-js";

function getBaseUrl(): string {
  const url = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  if (!url) throw new Error("VITE_API_BASE_URL is not configured.");
  return url;
}

export default defineTool({
  name: "get_dashboard_summary",
  title: "Get live dashboard summary",
  description:
    "Return live TrustPoll dashboard data: total votes, per-project vote counts, recent votes, and server health (server_1, server_2).",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async () => {
    const res = await fetch(`${getBaseUrl()}/api/dashboard-summary`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch dashboard summary (${res.status}).`,
          },
        ],
        isError: true,
      };
    }
    const summary = (await res.json()) as Record<string, unknown>;
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
