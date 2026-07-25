import { defineMcp } from "@lovable.dev/mcp-js";
import listProjectsTool from "./tools/list-projects";
import getDashboardSummaryTool from "./tools/get-dashboard-summary";
import askChatbotTool from "./tools/ask-chatbot";

export default defineMcp({
  name: "trustpoll-mcp",
  title: "TrustPoll MCP",
  version: "0.1.0",
  instructions:
    "Public tools for the TrustPoll live voting system. Use `list_projects` to see Network Expo projects, `get_dashboard_summary` for live vote totals and server health, and `ask_chatbot` to query the TrustPoll assistant in natural language.",
  tools: [listProjectsTool, getDashboardSummaryTool, askChatbotTool],
});
