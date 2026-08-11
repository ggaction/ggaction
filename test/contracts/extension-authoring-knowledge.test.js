import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const guidePath = path.join(root, "knowledge/extension-authoring.md");

test("routes installed extension agents through current package knowledge", async () => {
  const guide = await readFile(guidePath, "utf8");

  for (const heading of [
    "Purpose and authority",
    "Minimum intake",
    "Design from the feature, then the actions",
    "Freeze the executable design before code",
    "Composition and ownership",
    "Core model",
    "Lifecycle and atomic failure",
    "Primitive oracle and visual acceptance",
    "Current action-authoring boundary",
    "Upstream decision boundary",
    "LLM working discipline",
    "Required evidence"
  ]) {
    assert.match(guide, new RegExp(`^## ${heading}$`, "m"));
  }

  assert.match(guide, /installed ggaction version/);
  assert.match(guide, /action-cards\.json/);
  assert.match(guide, /Do not substitute behavior from the mutable\nGitHub default branch/);
  assert.match(guide, /shortest complete public program/);
  assert.match(guide, /one canonical resolver and one canonical state owner/);
  assert.match(guide, /before returning the first changed program/);
  assert.match(guide, /decoded pixels/);
  assert.match(guide, /submit only the exact user request/);
  assert.match(guide, /known unsupported capability as terminal/);
  assert.doesNotMatch(guide, /registerExtension/);
});

test("keeps every local extension knowledge link resolvable", async () => {
  const guide = await readFile(guidePath, "utf8");
  const links = [...guide.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)]
    .map(match => match[1]);

  assert.ok(links.length > 0);
  for (const link of links) {
    await access(path.resolve(path.dirname(guidePath), link));
  }
});
