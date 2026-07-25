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
  name: "ask_chatbot",
  title: "Ask the TrustPoll chatbot",
  description:
    "Send a natural-language question about the TrustPoll system (server health, vote counts, etc.) and return the chatbot's response.",
  inputSchema: {
    question: z
      .string()
      .min(1)
      .describe("The question to ask the TrustPoll chatbot."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async ({ question }) => {
    const res = await fetch(`${getBaseUrl()}/api/chatbot-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      return {
        content: [
          { type: "text", text: `Chatbot request failed (${res.status}).` },
        ],
        isError: true,
      };
    }
    const ct = res.headers.get("content-type") ?? "";
    const answer = ct.includes("application/json")
      ? ((await res.json()) as { response?: string }).response ?? ""
      : await res.text();
    return {
      content: [{ type: "text", text: answer }],
      structuredContent: { response: answer },
    };
  },
});
