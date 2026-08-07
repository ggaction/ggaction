import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createPackageArtifact } from "../package-artifact.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function linkDependency({ consumerDirectory, dependencyRoot, name }) {
  const source = path.join(dependencyRoot, "node_modules", ...name.split("/"));
  const target = path.join(consumerDirectory, "node_modules", ...name.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await symlink(source, target, process.platform === "win32" ? "junction" : "dir");
}

export async function prepareInstalledMcpArtifact({ sourceRoot = root, dependencyRoot = root } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-evaluation-package-"));
  const packedDirectory = path.join(directory, "packed");
  const consumerDirectory = path.join(directory, "consumer");
  try {
    await Promise.all([
      mkdir(packedDirectory),
      mkdir(path.join(consumerDirectory, "node_modules"), { recursive: true })
    ]);
    const packed = await createPackageArtifact({ cwd: sourceRoot, outputDirectory: packedDirectory });
    execFileSync("tar", ["-xzf", packed.file, "-C", path.join(consumerDirectory, "node_modules")], {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30_000
    });
    await rename(
      path.join(consumerDirectory, "node_modules", "package"),
      path.join(consumerDirectory, "node_modules", "ggaction")
    );
    const manifest = JSON.parse(await readFile(
      path.join(consumerDirectory, "node_modules", "ggaction", "package.json"),
      "utf8"
    ));
    if (manifest.name !== packed.name || manifest.version !== packed.version) {
      throw new Error("Installed MCP package identity differs from the packed artifact.");
    }
    await Promise.all(Object.keys(manifest.dependencies ?? {}).map(name =>
      linkDependency({ consumerDirectory, dependencyRoot, name })
    ));
    const executable = path.join(consumerDirectory, "node_modules", "ggaction", "bin", "ggaction-mcp.js");
    await chmod(executable, 0o755);
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
      clientOptions: Object.freeze({
        command: process.platform === "win32" ? process.execPath : executable,
        args: process.platform === "win32" ? [executable] : [],
        cwd: consumerDirectory,
        artifact
      }),
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
