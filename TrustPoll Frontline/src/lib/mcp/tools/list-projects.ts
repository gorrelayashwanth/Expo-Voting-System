import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function getBaseUrl(): string {
  const url = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  if (!url) throw new Error("VITE_API_BASE_URL is not configured.");
  return url;
}

export default defineTool({
  name: "list_projects",
  title: "List Network Expo projects",
  description:
    "Return the list of Network Expo projects available for voting, ordered by project number.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async () => {
    const res = await fetch(`${getBaseUrl()}/api/projects`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        content: [
          { type: "text", text: `Failed to fetch projects (${res.status}).` },
        ],
        isError: true,
      };
    }
    const projects = (await res.json()) as unknown[];
    return {
      content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      structuredContent: { projects },
    };
  },
});
