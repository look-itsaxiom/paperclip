import type { ServerAdapterModule, AdapterSessionCodec } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";

export { execute } from "./execute.js";

export const type = "gemini_local";

export async function testEnvironment(): Promise<any> {
  return {
    adapterType: type,
    status: "pass",
    checks: [],
    testedAt: new Date().toISOString(),
  };
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const sessionId = readNonEmptyString(record.sessionId) ?? readNonEmptyString(record.session_id);
    if (!sessionId) return null;
    const cwd = readNonEmptyString(record.cwd);
    return {
      sessionId,
      ...(cwd ? { cwd } : {}),
    };
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params) return null;
    const sessionId = readNonEmptyString(params.sessionId) ?? readNonEmptyString(params.session_id);
    if (!sessionId) return null;
    const cwd = readNonEmptyString(params.cwd);
    return {
      sessionId,
      ...(cwd ? { cwd } : {}),
    };
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params) return null;
    return readNonEmptyString(params.sessionId) ?? readNonEmptyString(params.session_id);
  },
};

export const adapter: ServerAdapterModule = {
  type,
  execute,
  testEnvironment,
  sessionCodec,
  supportsLocalAgentJwt: true,
};

export default adapter;
