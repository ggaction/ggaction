import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export const PACKAGE_LIMITS = Object.freeze({
  entries: 300,
  packedBytes: 400_000,
  unpackedBytes: 1_500_000
});

const REQUIRED_FILES = Object.freeze([
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
  "src/index.js",
  "src/extension.js",
  "src/renderers/png.js",
  "types/index.d.ts",
  "types/extension.d.ts",
  "types/png.d.ts",
  "types/program.d.ts"
]);

function runPack(args, cwd = root) {
  const output = execFileSync(npmCommand, ["pack", "--json", ...args], {
    cwd,
    encoding: "utf8"
  });
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error("npm pack must describe exactly one package artifact.");
  }
  return parsed[0];
}

export function validatePackageManifest(manifest) {
  const files = manifest.files?.map(file => file.path) ?? [];
  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) {
      throw new Error(`Package artifact is missing required file "${required}".`);
    }
  }
  for (const file of files) {
    if (![
      "CHANGELOG.md",
      "LICENSE",
      "README.md",
      "package.json"
    ].includes(file) && !file.startsWith("src/") && !file.startsWith("types/")) {
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
    ...(result.file ? { file: result.file, sha256: result.sha256 } : {})
  }, null, 2)}\n`);
}
