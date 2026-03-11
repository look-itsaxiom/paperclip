import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftNumberInput,
  help,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";
import { LocalWorkspaceRuntimeFields } from "../local-workspace-runtime-fields";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function GeminiLocalConfigFields(props: AdapterConfigFieldsProps) {
  const {
    isCreate,
    values,
    set,
    config,
    eff,
    mark,
  } = props;

  return (
    <>
      <Field label="Agent instructions file" hint="Absolute path to a markdown file that defines this agent's behavior.">
        <div className="flex items-center gap-2">
          <DraftInput
            value={
              isCreate
                ? values!.instructionsFilePath ?? ""
                : eff(
                    "adapterConfig",
                    "instructionsFilePath",
                    String(config.instructionsFilePath ?? ""),
                  )
            }
            onCommit={(v) =>
              isCreate
                ? set!({ instructionsFilePath: v })
                : mark("adapterConfig", "instructionsFilePath", v || undefined)
            }
            immediate
            className={inputClass}
            placeholder="/absolute/path/to/AGENTS.md"
          />
          <ChoosePathButton />
        </div>
      </Field>

      <LocalWorkspaceRuntimeFields {...props} />

      <div className="mt-4 border-t border-border/40 pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Advanced</h4>
        <Field label="Max turns per run" hint={help.maxTurnsPerRun}>
          {isCreate ? (
            <input
              type="number"
              className={inputClass}
              value={values!.maxTurnsPerRun}
              onChange={(e) => set!({ maxTurnsPerRun: Number(e.target.value) })}
            />
          ) : (
            <DraftNumberInput
              value={eff(
                "adapterConfig",
                "maxTurnsPerRun",
                Number(config.maxTurnsPerRun ?? 80),
              )}
              onCommit={(v) => mark("adapterConfig", "maxTurnsPerRun", v || 80)}
              immediate
              className={inputClass}
            />
          )}
        </Field>
      </div>
    </>
  );
}
