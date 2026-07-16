import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPackageArtifact } from "./package-artifact.js";
import { extractReleaseNotes, generateReleaseNotes } from "./release-notes.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const releaseDirectory = path.join(root, ".artifacts", "release");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export function validateReleaseIdentity({ tag, ref, packageVersion, lockVersion }) {
  if (typeof packageVersion !== "string" || packageVersion.length === 0) {
    throw new Error("Release package version must be non-empty.");
  }
  if (lockVersion !== packageVersion) {
    throw new Error(`package-lock version ${lockVersion} does not match ${packageVersion}.`);
  }
  const expectedTag = `v${packageVersion}`;
  if (tag !== expectedTag) {
    throw new Error(`Release tag must be "${expectedTag}".`);
  }
  if (ref !== `refs/tags/${tag}`) {
    throw new Error(`Release workflow must run from tag ref "refs/tags/${tag}".`);
  }
  return Object.freeze({ tag, version: packageVersion });
}

async function repositoryIdentity({ tag, ref }) {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const identity = validateReleaseIdentity({
    tag,
    ref,
    packageVersion: packageJson.version,
    lockVersion: lock.version
  });
  const commit = git(["rev-parse", "HEAD"]);
  const tagCommit = git(["rev-parse", `refs/tags/${tag}^{commit}`]);
  if (commit !== tagCommit) {
    throw new Error(`Release tag ${tag} does not resolve to checked-out commit ${commit}.`);
  }
  if (git(["status", "--porcelain"]).length !== 0) {
    throw new Error("Release candidate requires a clean worktree.");
  }
  return Object.freeze({ ...identity, commit, name: packageJson.name });
}

export async function createReleaseCandidate({ tag, ref }) {
  const identity = await repositoryIdentity({ tag, ref });
  const artifact = await createPackageArtifact({ outputDirectory: releaseDirectory });
  const notes = await generateReleaseNotes({ version: identity.version });
  const manifest = Object.freeze({
    schemaVersion: 1,
    name: identity.name,
    version: identity.version,
    tag: identity.tag,
    commit: identity.commit,
    filename: artifact.filename,
    sha1: artifact.sha1,
    sha256: artifact.sha256,
    entryCount: artifact.entryCount,
    packedBytes: artifact.size,
    unpackedBytes: artifact.unpackedSize,
    releaseNotes: path.basename(notes.output)
  });
  const manifestFile = path.join(releaseDirectory, "candidate.json");
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return Object.freeze({ manifest, manifestFile });
}

function hash(bytes, algorithm) {
  return createHash(algorithm).update(bytes).digest("hex");
}

export async function verifyReleaseCandidate({ manifestFile, tag, ref }) {
  const identity = await repositoryIdentity({ tag, ref });
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  for (const [key, value] of Object.entries({
    name: identity.name,
    version: identity.version,
    tag: identity.tag,
    commit: identity.commit
  })) {
    if (manifest[key] !== value) {
      throw new Error(`Release manifest ${key} does not match the checked-out release.`);
    }
  }
  const directory = path.dirname(manifestFile);
  const bytes = await readFile(path.join(directory, manifest.filename));
  if (hash(bytes, "sha1") !== manifest.sha1 || hash(bytes, "sha256") !== manifest.sha256) {
    throw new Error("Release tarball digest does not match candidate.json.");
  }
  const changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
  const expectedNotes = extractReleaseNotes(changelog, identity.version);
  const actualNotes = await readFile(path.join(directory, manifest.releaseNotes), "utf8");
  if (actualNotes !== expectedNotes) {
    throw new Error("Release notes do not match CHANGELOG.md.");
  }
  return Object.freeze(manifest);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const verify = process.argv[2] === "--verify";
  const tag = verify ? process.argv[4] : process.argv[2];
  const ref = process.env.GITHUB_REF;
  if (!tag || !ref) {
    throw new Error("Release candidate requires a tag argument and GITHUB_REF tag ref.");
  }
  const result = verify
    ? await verifyReleaseCandidate({ manifestFile: path.resolve(process.argv[3]), tag, ref })
    : (await createReleaseCandidate({ tag, ref })).manifest;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
