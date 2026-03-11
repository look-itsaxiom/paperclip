import type { CLIAdapterModule } from "@paperclipai/adapter-utils";

export const type = "gemini_local";

export const cli: CLIAdapterModule = {
  type,
  formatStdoutEvent: (line, debug) => {
    // For now, just print the line if debug is on
    if (debug) {
      console.log(`[gemini-local] ${line}`);
    }
  },
};

export default cli;
