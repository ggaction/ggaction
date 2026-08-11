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
    "Core model",
    "Current action-authoring boundary",
    "Upstream decision boundary",
    "Required evidence"
  ]) {
    assert.match(guide, new RegExp(`^## ${heading}$`, "m"));
  }

  assert.match(guide, /installed ggaction version/);
  assert.match(guide, /action-cards\.json/);
  assert.match(guide, /Do not substitute behavior from the mutable\nGitHub default branch/);
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
