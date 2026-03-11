import type { StdoutLineParser, TranscriptEntry, CreateConfigValues } from "@paperclipai/adapter-utils";
import { asString, asNumber, parseObject, parseJson } from "@paperclipai/adapter-utils/server-utils";

export const type = "gemini_local";

export const parseGeminiStdoutLine: StdoutLineParser = (line, ts) => {
  const event = parseJson(line);
  if (!event) return [];

  const type = asString(event.type, "");
  if (type === "system" && asString(event.subtype, "") === "init") {
    return [
      {
        kind: "init",
        ts,
        model: asString(event.model, "unknown"),
        sessionId: asString(event.session_id, "unknown"),
      },
    ];
  }

  if (type === "assistant") {
    const message = parseObject(event.message);
    const content = Array.isArray(message.content) ? message.content : [];
    const entries: TranscriptEntry[] = [];
    for (const entry of content) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      const block = entry as Record<string, unknown>;
      if (asString(block.type, "") === "text") {
        entries.push({ kind: "assistant", ts, text: asString(block.text, ""), delta: true });
      }
    }
    return entries;
  }

  if (type === "thinking") {
    return [{ kind: "thinking", ts, text: asString(event.text, ""), delta: true }];
  }

  if (type === "tool_call") {
    return [
      {
        kind: "tool_call",
        ts,
        name: asString(event.name, "unknown"),
        input: event.input,
      },
    ];
  }

  if (type === "tool_result") {
    return [
      {
        kind: "tool_result",
        ts,
        toolUseId: asString(event.tool_use_id, ""),
        content: asString(event.content, ""),
        isError: Boolean(event.is_error),
      },
    ];
  }

  if (type === "result") {
    const usage = parseObject(event.usage);
    return [
      {
        kind: "result",
        ts,
        text: asString(event.result, ""),
        inputTokens: asNumber(usage.input_tokens, 0),
        outputTokens: asNumber(usage.output_tokens, 0),
        cachedTokens: asNumber(usage.cache_read_input_tokens, 0),
        costUsd: asNumber(event.total_cost_usd, 0),
        subtype: asString(event.subtype, ""),
        isError: (asNumber(event.exit_code, 0) || 0) !== 0,
        errors: Array.isArray(event.errors) ? event.errors.map((e: any) => String(e)) : [],
      },
    ];
  }

  return [];
};

export function buildGeminiLocalConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.model) ac.model = v.model;
  ac.yolo = v.dangerouslySkipPermissions; // Map this to yolo for Gemini
  ac.timeoutSec = 0;
  ac.graceSec = 15;
  ac.maxTurnsPerRun = v.maxTurnsPerRun;
  if (v.command) ac.command = v.command;
  if (v.extraArgs) {
     ac.extraArgs = v.extraArgs.split(",").map(s => s.trim()).filter(Boolean);
  }
  return ac;
}
