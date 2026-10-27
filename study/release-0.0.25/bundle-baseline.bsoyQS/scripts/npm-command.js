import { existsSync } from "node:fs";
import path from "node:path";

export function npmInvocation(args, { env = process.env, platform = process.platform, node = process.execPath, exists = existsSync } = {}) {
  if (typeof env.npm_execpath === "string" && env.npm_execpath.length > 0) {
    return { command: node, args: [env.npm_execpath, ...args] };
  }
  if (platform === "win32") {
    const cli = path.win32.join(path.win32.dirname(node), "node_modules", "npm", "bin", "npm-cli.js");
    if (exists(cli)) return { command: node, args: [cli, ...args] };
    throw new Error("Run this development script through npm run on Windows so npm_execpath identifies the npm CLI.");
  }
  return { command: "npm", args };
}
