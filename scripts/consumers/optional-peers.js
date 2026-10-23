import { execFileSync, spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, run, npmCommand, tscCommand } from "./runtime.js";

export async function testOptionalDependencies(consumer) {
  const source = await readFile(new URL("./fixtures/optional-peers-1.mjs", import.meta.url), "utf8");
  await writeFile(path.join(consumer.directory, "optional-consumer.mjs"), source);
  run(process.execPath, ["optional-consumer.mjs"], consumer.directory);
  const cli = spawnSync(process.execPath, ["node_modules/ggaction/src/mcp/cli.js"], {
    cwd: consumer.directory, encoding: "utf8"
  });
  if (cli.status !== 1 || !cli.stderr.includes("npm install ggaction @modelcontextprotocol/sdk")) {
    throw new Error(`Missing SDK diagnostic failed: ${cli.stderr}`);
  }
  const peers = consumer.installedManifest.peerDependencies;
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const selectedPeers = Object.fromEntries(Object.entries(peers).map(([name, range]) => {
    const version = process.env.GGACTION_PEER_MODE === "latest" ? range : lock.packages[`node_modules/${name}`]?.version;
    if (!version) throw new Error(`Missing locked consumer peer: ${name}`);
    return [name, version];
  }));
  run(npmCommand, ["install", "--ignore-scripts", "--no-audit", "--no-fund",
    ...Object.entries(selectedPeers).map(([name, version]) => `${name}@${version}`)
  ], consumer.directory, { env: {
    ...process.env, NPM_CONFIG_CACHE: path.join(consumer.directory, ".npm-cache")
  } });
  consumer.resolvedPeers = Object.fromEntries(await Promise.all(Object.keys(peers).map(async name =>
    [name, JSON.parse(await readFile(path.join(consumer.directory, "node_modules", name, "package.json"), "utf8")).version])));
}
