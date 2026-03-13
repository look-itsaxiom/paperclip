import type { AdapterConfigFieldsProps } from "../types";
import {
  DraftInput,
  Field,
  ToggleField,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Prepended to the Gemini prompt at runtime.";

export function GeminiLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      <Field label="Agent instructions file" hint={instructionsFileHint}>
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

      <ToggleField
        label="YOLO mode"
        hint="Pass --approval-mode yolo to Gemini for unattended operation."
        checked={
          isCreate
            ? values!.geminiYolo
            : Boolean(eff("adapterConfig", "yolo", config.yolo === true))
        }
        onCheckedChange={(v) =>
          isCreate
            ? set!({ geminiYolo: v })
            : mark("adapterConfig", "yolo", v)
        }
      />

      <ToggleField
        label="Sandbox mode"
        hint="Pass --sandbox to Gemini. If disabled, passes --sandbox=none."
        checked={
          isCreate
            ? values!.geminiSandbox
            : Boolean(eff("adapterConfig", "sandbox", config.sandbox === true))
        }
        onCheckedChange={(v) =>
          isCreate
            ? set!({ geminiSandbox: v })
            : mark("adapterConfig", "sandbox", v)
        }
      />
    </>
  );
}
