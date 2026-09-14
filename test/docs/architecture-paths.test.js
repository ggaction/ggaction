import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("current architecture source module references resolve in this repository", () => {
  const root = new URL("../../", import.meta.url);
  const source = readFileSync(new URL("agent_docs/SECOND_ARCHITECTURE.md", root), "utf8");
  const references = [...source.matchAll(/`((?:src\/)?(?:actions|core|grammar|layout|materialization|renderers|selectors)\/[A-Za-z0-9_./-]+\.js)`/g)]
    .map(match => match[1]);
  assert.ok(references.length > 20);
  for (const reference of references) {
    const file = reference.startsWith("src/") ? reference : `src/${reference}`;
    assert.equal(existsSync(new URL(file, root)), true, reference);
  }
});
