import * as p from "@clack/prompts";
import type { LlmConfig } from "../config/schema.js";

export async function promptLlm(): Promise<LlmConfig | undefined> {
  const configureLlm = await p.confirm({
    message: "Configure an LLM provider now?",
    initialValue: false,
  });

  if (p.isCancel(configureLlm)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!configureLlm) return undefined;

  const provider = await p.select({
    message: "LLM provider",
    options: [
      { value: "claude" as const, label: "Claude (Anthropic)" },
      { value: "openai" as const, label: "OpenAI" },
      { value: "gemini" as const, label: "Gemini (Google)" },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const apiKeyLabel = (() => {
    if (provider === "claude") return "Anthropic API key";
    if (provider === "openai") return "OpenAI API key";
    return "Gemini/Google API key";
  })();

  const apiKey = await p.password({
    message: apiKeyLabel,
    validate: (val) => {
      if (!val) return "API key is required";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return { provider, apiKey };
}
