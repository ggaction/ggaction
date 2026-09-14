export function npmInvocation(args, { env = process.env, platform = process.platform, node = process.execPath } = {}) {
  if (typeof env.npm_execpath === "string" && env.npm_execpath.length > 0) {
    return { command: node, args: [env.npm_execpath, ...args] };
  }
  if (platform === "win32") {
    throw new Error("Run this development script through npm run on Windows so npm_execpath identifies the npm CLI.");
  }
  return { command: "npm", args };
}
