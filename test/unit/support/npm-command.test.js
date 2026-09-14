import assert from "node:assert/strict";
import test from "node:test";
import { npmInvocation } from "../../../scripts/npm-command.js";

test("Windows invokes the npm JavaScript CLI through Node without a shell", () => {
  const cli = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
  const args = ["install", "C:\\project with spaces\\candidate.tgz"];
  assert.deepEqual(npmInvocation(args, { platform: "win32", env: { npm_execpath: cli }, node: "C:\\node.exe" }),
    { command: "C:\\node.exe", args: [cli, ...args] });
  assert.throws(() => npmInvocation([], { platform: "win32", env: {} }), /npm run on Windows/);
});

test("Unix uses the active npm CLI when available and otherwise the executable", () => {
  assert.deepEqual(npmInvocation(["pack"], { platform: "darwin", env: {} }), { command: "npm", args: ["pack"] });
  assert.deepEqual(npmInvocation(["pack"], { platform: "linux", env: { npm_execpath: "/tools/npm-cli.js" }, node: "/tools/node" }),
    { command: "/tools/node", args: ["/tools/npm-cli.js", "pack"] });
});
