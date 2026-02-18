/**
 * Build a service definition that injects SKYCLAW_TOKEN and runs the handler command.
 */
export function buildHandlerServiceDefinition(
  skyclawToken: string,
  handlerCommand = "bunx @skyclaw/handler start",
): { cmd: string; args: string[] } {
  return {
    cmd: "env",
    args: [`SKYCLAW_TOKEN=${skyclawToken}`, "bash", "-lc", handlerCommand],
  };
}
