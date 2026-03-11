import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asString,
  asNumber,
  asBoolean,
  asStringArray,
  parseObject,
  parseJson,
  buildPaperclipEnv,
  redactEnvForLogs,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePathInEnv,
  renderTemplate,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import {
  parseGeminiStreamJson,
  describeGeminiFailure,
  detectGeminiLoginRequired,
  isGeminiMaxTurnsResult,
  isGeminiUnknownSessionError,
} from "./parse.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
const PAPERCLIP_SKILLS_CANDIDATES = [
  path.resolve(__moduleDir, "../../skills"),
  path.resolve(__moduleDir, "../../../../../skills"),
];

async function resolvePaperclipSkillsDir(): Promise<string | null> {
  for (const candidate of PAPERCLIP_SKILLS_CANDIDATES) {
    const isDir = await fs.stat(candidate).then((s) => s.isDirectory()).catch(() => false);
    if (isDir) return candidate;
  }
  return null;
}

async function buildSkillsDir(): Promise<string> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-gemini-skills-"));
  const target = path.join(tmp, ".gemini", "skills");
  await fs.mkdir(target, { recursive: true });
  const skillsDir = await resolvePaperclipSkillsDir();
  if (!skillsDir) return tmp;
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await fs.symlink(
        path.join(skillsDir, entry.name),
        path.join(target, entry.name),
      );
    }
  }
  return tmp;
}

interface GeminiExecutionInput {
  runId: string;
  agent: AdapterExecutionContext["agent"];
  config: Record<string, unknown>;
  context: Record<string, unknown>;
  authToken?: string;
}

interface GeminiRuntimeConfig {
  command: string;
  cwd: string;
  workspaceId: string | null;
  workspaceRepoUrl: string | null;
  workspaceRepoRef: string | null;
  env: Record<string, string>;
  timeoutSec: number;
  graceSec: number;
  extraArgs: string[];
}

async function buildGeminiRuntimeConfig(input: GeminiExecutionInput): Promise<GeminiRuntimeConfig> {
  const { runId, agent, config, context, authToken } = input;

  const command = asString(config.command, "gemini");
  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const workspaceSource = asString(workspaceContext.source, "");
  const workspaceId = asString(workspaceContext.workspaceId, "") || null;
  const workspaceRepoUrl = asString(workspaceContext.repoUrl, "") || null;
  const workspaceRepoRef = asString(workspaceContext.repoRef, "") || null;
  const configuredCwd = asString(config.cwd, "");
  const useConfiguredInsteadOfAgentHome = workspaceSource === "agent_home" && configuredCwd.length > 0;
  const effectiveWorkspaceCwd = useConfiguredInsteadOfAgentHome ? "" : workspaceCwd;
  const cwd = effectiveWorkspaceCwd || configuredCwd || process.cwd();
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });

  const envConfig = parseObject(config.env);
  const hasExplicitApiKey =
    typeof envConfig.PAPERCLIP_API_KEY === "string" && envConfig.PAPERCLIP_API_KEY.trim().length > 0;
  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  env.PAPERCLIP_RUN_ID = runId;

  // Add Paperwork specific envs if available
  if (context.taskId) env.PAPERCLIP_TASK_ID = String(context.taskId);
  if (context.issueId) env.PAPERCLIP_ISSUE_ID = String(context.issueId);

  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }

  if (!hasExplicitApiKey && authToken) {
    env.PAPERCLIP_API_KEY = authToken;
  }

  const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });
  await ensureCommandResolvable(command, cwd, runtimeEnv);

  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);
  const extraArgs = asStringArray(config.extraArgs || config.args);

  return {
    command,
    cwd,
    workspaceId,
    workspaceRepoUrl,
    workspaceRepoRef,
    env,
    timeoutSec,
    graceSec,
    extraArgs,
  };
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, authToken } = ctx;

  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const model = asString(config.model, "");
  const yolo = asBoolean(config.yolo, false);
  const maxTurns = asNumber(config.maxTurnsPerRun, 0);

  const runtimeConfig = await buildGeminiRuntimeConfig({
    runId,
    agent,
    config,
    context,
    authToken,
  });
  const {
    command,
    cwd,
    workspaceId,
    workspaceRepoUrl,
    workspaceRepoRef,
    env,
    timeoutSec,
    graceSec,
    extraArgs,
  } = runtimeConfig;

  const skillsDir = await buildSkillsDir();

  // Write department skills
  const departmentSkills = Array.isArray(context.paperclipDepartmentSkills)
    ? context.paperclipDepartmentSkills.filter(
        (s): s is { slug: string; name: string; description: string; contentMd: string } =>
          typeof s === "object" && s !== null && typeof (s as any).slug === "string",
      )
    : [];
  for (const skill of departmentSkills) {
    const skillDir = path.join(skillsDir, ".gemini", "skills", `dept-${skill.slug}`);
    await fs.mkdir(skillDir, { recursive: true });
    const skillContent = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.contentMd}`;
    await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent, "utf-8");
  }

  // Write project warm-start context
  const projectContext = typeof context.paperclipProjectContext === "object" && context.paperclipProjectContext !== null
    ? context.paperclipProjectContext as Record<string, unknown>
    : null;
  if (projectContext) {
    const warmStartPath = path.join(skillsDir, ".gemini", "project-context.md");
    await fs.mkdir(path.dirname(warmStartPath), { recursive: true });
    const lines: string[] = ["# Project Context (auto-generated warm-start)"];
    if (projectContext.statusMd) lines.push(`\n## Status\n${projectContext.statusMd}`);
    // ... add more as needed
    await fs.writeFile(warmStartPath, lines.join("\n"), "utf-8");
  }

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const runtimeSessionId = asString(runtimeSessionParams.sessionId, runtime.sessionId ?? "");
  const sessionId = runtimeSessionId; // TODO: check CWD matching if needed

  const prompt = renderTemplate(promptTemplate, {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    agent,
    context,
  });

  const buildGeminiArgs = (resumeSessionId: string | null) => {
    const args = ["--output-format", "stream-json"];
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    if (yolo) args.push("--yolo");
    if (model) args.push("--model", model);
    // Gemini CLI uses -p for headless prompt
    args.push("--prompt", prompt);
    // Injected skills directory
    // Gemini CLI looks for .gemini in CWD or home. We can use GEMINI_CONFIG_HOME or similar if supported,
    // but for now let's assume it can find it if we are in a tmp dir or if we provide it via env.
    // Actually, gemini-cli supports --policy to load extra things.
    args.push("--policy", skillsDir);
    if (extraArgs.length > 0) args.push(...extraArgs);
    return args;
  };

  const runAttempt = async (resumeSessionId: string | null) => {
    const args = buildGeminiArgs(resumeSessionId);
    if (onMeta) {
      await onMeta({
        adapterType: "gemini_local",
        command,
        cwd,
        commandArgs: args,
        env: redactEnvForLogs(env),
        prompt,
        context,
      });
    }

    const proc = await runChildProcess(runId, command, args, {
      cwd,
      env,
      timeoutSec,
      graceSec,
      onLog,
    });

    const parsedStream = parseGeminiStreamJson(proc.stdout);
    return { proc, parsedStream };
  };

  const toAdapterResult = (
    attempt: {
      proc: any;
      parsedStream: any;
    },
    opts: { fallbackSessionId: string | null },
  ): AdapterExecutionResult => {
    const { proc, parsedStream } = attempt;
    const loginMeta = detectGeminiLoginRequired({
      parsed: parsedStream.resultJson,
      stdout: proc.stdout,
      stderr: proc.stderr,
    });

    if (proc.timedOut) {
      return {
        exitCode: proc.exitCode,
        signal: proc.signal,
        timedOut: true,
        errorMessage: `Timed out after ${timeoutSec}s`,
        errorCode: "timeout",
      };
    }

    const resolvedSessionId = parsedStream.sessionId || opts.fallbackSessionId;
    const resolvedSessionParams = resolvedSessionId
      ? { sessionId: resolvedSessionId, cwd }
      : null;

    return {
      exitCode: proc.exitCode,
      signal: proc.signal,
      timedOut: false,
      errorMessage:
        (proc.exitCode ?? 0) === 0
          ? null
          : describeGeminiFailure(parsedStream.resultJson ?? {}) || `Gemini exited with code ${proc.exitCode ?? -1}`,
      errorCode: loginMeta.requiresLogin ? "gemini_auth_required" : null,
      usage: parsedStream.usage,
      sessionId: resolvedSessionId,
      sessionParams: resolvedSessionParams,
      sessionDisplayId: resolvedSessionId,
      provider: "google",
      model: parsedStream.model || model,
      billingType: "subscription", // Gemini CLI usually uses subscription or free tier
      costUsd: parsedStream.costUsd,
      resultJson: parsedStream.resultJson,
      summary: parsedStream.summary,
      clearSession: isGeminiMaxTurnsResult(parsedStream.resultJson),
    };
  };

  try {
    const initial = await runAttempt(sessionId ?? null);
    if (
      sessionId &&
      !initial.proc.timedOut &&
      (initial.proc.exitCode ?? 0) !== 0 &&
      initial.parsedStream.resultJson &&
      isGeminiUnknownSessionError(initial.parsedStream.resultJson)
    ) {
      const retry = await runAttempt(null);
      return toAdapterResult(retry, { fallbackSessionId: null });
    }

    return toAdapterResult(initial, { fallbackSessionId: runtimeSessionId });
  } finally {
    fs.rm(skillsDir, { recursive: true, force: true }).catch(() => {});
  }
}
