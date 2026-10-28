import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const archive = path.resolve(".artifacts/release/ggaction-0.0.26.tgz");
const hash = () => createHash("sha256").update(readFileSync(archive)).digest("hex");
const original = hash(), reports = [];
for (const [id, node] of [
  ["node22", process.execPath],
  ["node20", "/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node"],
  ["node24", "/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node"]
]) {
  const directory = `.artifacts/validation/statistics-integration/matrix/${id}`;
  mkdirSync(directory, { recursive: true });
  const started = new Date().toISOString();
  const command = ["scripts/package-consumer.js", archive];
  const result = spawnSync(node, command, {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PATH: `${path.dirname(node)}:${process.env.PATH}` }
  });
  writeFileSync(`${directory}/run.log`, result.stdout + result.stderr);
  for (const file of ["qualification.json", "node-cases.json", "tutorials.json"])
    copyFileSync(`.artifacts/consumers/${file}`, `${directory}/${file}`);
  reports.push({ id, node, args: command, started, finished: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, artifactSha256: hash() });
  writeFileSync(".artifacts/validation/statistics-integration/matrix/result.json", JSON.stringify(reports, null, 2));
  if (result.status !== 0 || hash() !== original) process.exit(1);
}
