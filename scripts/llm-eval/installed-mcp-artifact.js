import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createPackageArtifact } from "../package-artifact.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export async function prepareInstalledMcpArtifact({ sourceRoot = root } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-evaluation-package-"));
  const packedDirectory = path.join(directory, "packed");
  const consumerDirectory = path.join(directory, "consumer");
  const cacheDirectory = path.join(directory, "npm-cache");
  try {
    await Promise.all([
      mkdir(packedDirectory),
      mkdir(consumerDirectory),
      mkdir(cacheDirectory)
    ]);
    const packed = await createPackageArtifact({ cwd: sourceRoot, outputDirectory: packedDirectory });
    execFileSync(npmCommand, [
      "install",
      packed.file,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false"
    ], {
      cwd: consumerDirectory,
      env: { ...process.env, NPM_CONFIG_CACHE: cacheDirectory },
      encoding: "utf8",
      stdio: "pipe"
    });
    const manifest = JSON.parse(await readFile(
      path.join(consumerDirectory, "node_modules", "ggaction", "package.json"),
      "utf8"
    ));
    if (manifest.name !== packed.name || manifest.version !== packed.version) {
      throw new Error("Installed MCP package identity differs from the packed artifact.");
    }
    const executable = path.join(
      consumerDirectory,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "ggaction-mcp.cmd" : "ggaction-mcp"
    );
    const knowledgeModule = path.join(consumerDirectory, "node_modules", "ggaction", "mcp", "knowledge.js");
    const artifact = Object.freeze({
      name: packed.name,
      version: packed.version,
      sha256: packed.sha256,
      entryCount: packed.entryCount,
      packedBytes: packed.size,
      unpackedBytes: packed.unpackedSize,
      source: "installed-package"
    });
    return Object.freeze({
      directory,
      executable,
      knowledgeModule,
      artifact,
      clientOptions: Object.freeze({ command: executable, cwd: consumerDirectory, artifact }),
      cleanup: () => rm(directory, { recursive: true, force: true })
    });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function loadInstalledDirectKnowledge(installed) {
  if (typeof installed?.knowledgeModule !== "string" || installed?.artifact?.source !== "installed-package") {
    throw new TypeError("An installed ggaction package artifact is required.");
  }
  const module = await import(`${pathToFileURL(installed.knowledgeModule).href}?sha256=${installed.artifact.sha256}`);
  if (typeof module.searchKnowledge !== "function" || typeof module.readKnowledge !== "function") {
    throw new Error("Installed package does not expose its internal knowledge implementation.");
  }
  return Object.freeze({
    search: module.searchKnowledge,
    read: module.readKnowledge,
    artifact: installed.artifact
  });
}
