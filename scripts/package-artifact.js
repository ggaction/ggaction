import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { transformSync } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export const PACKAGE_LIMITS = Object.freeze({
  entries: 453,
  packedBytes: 513_000,
  unpackedBytes: 2_500_000
});

const REQUIRED_FILES = Object.freeze([
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
  "knowledge/action-card.schema.json",
  "knowledge/action-cards.json",
  "knowledge/action-cards.schema.json",
  "knowledge/extension-authoring.md",
  "knowledge/intent-taxonomy.json",
  "knowledge/intent-taxonomy.schema.json",
  "knowledge/mcp-resources.json",
  "knowledge/mcp-resources.schema.json",
  "knowledge/task-packet.schema.json",
  "knowledge/task-resolver.js",
  "src/index.js",
  "src/basic.js",
  "src/extension.js",
  "src/mcp/adapter.js",
  "src/mcp/cli.js",
  "src/mcp/server.js",
  "src/renderers/pdf.js",
  "src/renderers/png.js",
  "src/renderers/svg.js",
  "types/index.d.ts",
  "types/basic.d.ts",
  "types/extension.d.ts",
  "types/pdf.d.ts",
  "types/png.d.ts",
  "types/svg.d.ts",
  "types/program.d.ts"
]);

const FORBIDDEN_BASENAMES = new Set(["AGENTS.md"]);
const COMPACT_JSON_FILES = Object.freeze([
  "knowledge/action-card.schema.json",
  "knowledge/action-cards.json",
  "knowledge/action-cards.schema.json",
  "knowledge/intent-taxonomy.json",
  "knowledge/intent-taxonomy.schema.json",
  "knowledge/mcp-resources.json",
  "knowledge/mcp-resources.schema.json",
  "knowledge/task-packet.schema.json"
]);
const COMPACT_JAVASCRIPT_FILES = Object.freeze([
  "knowledge/task-resolver.js"
]);

export function compactPackageJavaScript(source) {
  return transformSync(source, {
    format: "esm",
    keepNames: true,
    legalComments: "inline",
    loader: "js",
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    target: "node20"
  }).code;
}

export function isolatedPackEnvironment(cache, environment = process.env) {
  return {
    ...environment,
    NPM_CONFIG_CACHE: cache
  };
}

function pack(args, cwd, environment) {
  const output = execFileSync(npmCommand, ["pack", "--json", ...args], {
    cwd,
    encoding: "utf8",
    env: environment
  });
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error("npm pack must describe exactly one package artifact.");
  }
  return parsed[0];
}

function stagePackage(cwd, environment) {
  const staging = mkdtempSync(path.join(tmpdir(), "ggaction-npm-stage-"));
  try {
    const manifest = pack(["--dry-run"], cwd, environment);
    for (const { path: file } of manifest.files ?? []) {
      const source = path.resolve(cwd, file);
      const destination = path.resolve(staging, file);
      if (!source.startsWith(`${path.resolve(cwd)}${path.sep}`) ||
        !destination.startsWith(`${staging}${path.sep}`)) {
        throw new Error(`npm pack returned unsafe file path "${file}".`);
      }
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(source, destination);
      chmodSync(destination, statSync(source).mode);
    }
    for (const file of COMPACT_JSON_FILES) {
      const stagedFile = path.join(staging, file);
      if (existsSync(stagedFile)) {
        writeFileSync(stagedFile, JSON.stringify(JSON.parse(
          readFileSync(stagedFile, "utf8")
        )));
      }
    }
    for (const file of COMPACT_JAVASCRIPT_FILES) {
      const stagedFile = path.join(staging, file);
      if (existsSync(stagedFile)) {
        writeFileSync(stagedFile, compactPackageJavaScript(
          readFileSync(stagedFile, "utf8")
        ));
      }
    }
    return staging;
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

function runPack(args, cwd = root) {
  const cache = mkdtempSync(path.join(tmpdir(), "ggaction-npm-pack-"));
  const environment = isolatedPackEnvironment(cache);
  let staging;
  try {
    staging = stagePackage(cwd, environment);
    return pack(args, staging, environment);
  } finally {
    if (staging !== undefined) rmSync(staging, { recursive: true, force: true });
    rmSync(cache, { recursive: true, force: true });
  }
}

export function validatePackageManifest(manifest) {
  const files = manifest.files?.map(file => file.path) ?? [];
  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) {
      throw new Error(`Package artifact is missing required file "${required}".`);
    }
  }
  for (const file of files) {
    if (FORBIDDEN_BASENAMES.has(path.posix.basename(file))) {
      throw new Error(`Package artifact includes forbidden internal file "${file}".`);
    }
    if (![
      "CHANGELOG.md",
      "LICENSE",
      "README.md",
      "package.json"
    ].includes(file) &&
      !file.startsWith("src/") &&
      !file.startsWith("types/") &&
      ![
        "knowledge/action-card.schema.json",
        "knowledge/action-cards.json",
        "knowledge/action-cards.schema.json",
        "knowledge/extension-authoring.md",
        "knowledge/intent-taxonomy.json",
        "knowledge/intent-taxonomy.schema.json",
        "knowledge/mcp-resources.json",
        "knowledge/mcp-resources.schema.json",
        "knowledge/task-packet.schema.json",
        "knowledge/task-resolver.js"
      ].includes(file)
    ) {
      throw new Error(`Package artifact includes forbidden file "${file}".`);
    }
  }
  if (manifest.entryCount > PACKAGE_LIMITS.entries) {
    throw new Error(`Package entry count ${manifest.entryCount} exceeds ${PACKAGE_LIMITS.entries}.`);
  }
  if (manifest.size > PACKAGE_LIMITS.packedBytes) {
    throw new Error(`Packed size ${manifest.size} exceeds ${PACKAGE_LIMITS.packedBytes} bytes.`);
  }
  if (manifest.unpackedSize > PACKAGE_LIMITS.unpackedBytes) {
    throw new Error(
      `Unpacked size ${manifest.unpackedSize} exceeds ${PACKAGE_LIMITS.unpackedBytes} bytes.`
    );
  }
  return manifest;
}

export function inspectPackageArtifact({ cwd = root } = {}) {
  return validatePackageManifest(runPack(["--dry-run"], cwd));
}

export async function createPackageArtifact({
  cwd = root,
  outputDirectory = path.join(root, ".artifacts", "release")
} = {}) {
  await mkdir(outputDirectory, { recursive: true });
  const manifest = validatePackageManifest(runPack([
    "--pack-destination",
    outputDirectory
  ], cwd));
  const file = path.resolve(outputDirectory, manifest.filename);
  const bytes = await readFile(file);
  return Object.freeze({
    ...manifest,
    file,
    sha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = process.argv.includes("--pack")
    ? await createPackageArtifact()
    : inspectPackageArtifact();
  process.stdout.write(`${JSON.stringify({
    name: result.name,
    version: result.version,
    filename: result.filename,
    entryCount: result.entryCount,
    packedBytes: result.size,
    unpackedBytes: result.unpackedSize,
    ...(result.file ? {
      file: result.file,
      sha1: result.sha1,
      sha256: result.sha256
    } : {})
  }, null, 2)}\n`);
}
