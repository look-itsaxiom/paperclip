import type { AdapterModel } from "./types.js";
import { models as geminiFallbackModels } from "@paperclipai/adapter-gemini-local";
import { readConfigFile } from "../config-file.js";

const GEMINI_MODELS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS_TIMEOUT_MS = 5000;
const GEMINI_MODELS_CACHE_TTL_MS = 60_000;

let cached: { keyFingerprint: string; expiresAt: number; models: AdapterModel[] } | null = null;

function fingerprint(apiKey: string): string {
  return `${apiKey.length}:${apiKey.slice(-6)}`;
}

function dedupeModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const deduped: AdapterModel[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push({ id, label: model.label.trim() || id });
  }
  return deduped;
}

function mergedWithFallback(models: AdapterModel[]): AdapterModel[] {
  return dedupeModels([
    ...models,
    ...geminiFallbackModels,
  ]).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true, sensitivity: "base" }));
}

function resolveGeminiApiKey(): string | null {
  const envKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (envKey) return envKey;

  const config = readConfigFile();
  if (config?.llm?.provider !== "gemini") return null;
  const configKey = config.llm.apiKey?.trim();
  return configKey && configKey.length > 0 ? configKey : null;
}

async function fetchGeminiModels(apiKey: string): Promise<AdapterModel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_MODELS_TIMEOUT_MS);
  try {
    const url = new URL(GEMINI_MODELS_ENDPOINT);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as { models?: unknown[] };
    const data = Array.isArray(payload.models) ? payload.models : [];
    const models: AdapterModel[] = [];
    for (const itemRaw of data) {
      if (typeof itemRaw !== "object" || itemRaw === null) continue;
      const item = itemRaw as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name : "";
      if (!name.startsWith("models/")) continue;
      
      const id = name.replace(/^models\//, "");
      const label = typeof item.displayName === "string" ? item.displayName : id;
      
      // Filter for models that support generation (basic heuristic)
      const methods = Array.isArray(item.supportedGenerationMethods) ? item.supportedGenerationMethods : [];
      if (methods.length > 0 && !methods.includes("generateContent")) continue;

      models.push({ id, label });
    }
    return dedupeModels(models);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function listGeminiModels(): Promise<AdapterModel[]> {
  const apiKey = resolveGeminiApiKey();
  const fallback = dedupeModels(geminiFallbackModels);
  if (!apiKey) return fallback;

  const now = Date.now();
  const keyFingerprint = fingerprint(apiKey);
  if (cached && cached.keyFingerprint === keyFingerprint && cached.expiresAt > now) {
    return cached.models;
  }

  const fetched = await fetchGeminiModels(apiKey);
  if (fetched.length > 0) {
    const merged = mergedWithFallback(fetched);
    cached = {
      keyFingerprint,
      expiresAt: now + GEMINI_MODELS_CACHE_TTL_MS,
      models: merged,
    };
    return merged;
  }

  if (cached && cached.keyFingerprint === keyFingerprint && cached.models.length > 0) {
    return cached.models;
  }

  return fallback;
}

export function resetGeminiModelsCacheForTests() {
  cached = null;
}
