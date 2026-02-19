/**
 * Build a service definition that injects SKYCLAW_TOKEN and runs the handler command.
 */
export function buildHandlerServiceDefinition(
  skyclawToken: string,
  handlerCommand = "bunx @skyclaw/handler start",
  extraEnv: Record<string, string> = {},
): { cmd: string; args: string[] } {
  const extraEnvArgs = Object.entries(extraEnv).map(
    ([key, value]) => `${key}=${value}`,
  );

  return {
    cmd: "env",
    args: [
      `SKYCLAW_TOKEN=${skyclawToken}`,
      ...extraEnvArgs,
      "bash",
      "-lc",
      handlerCommand,
    ],
  };
}
