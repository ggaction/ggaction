import { SEARCH_INDEX_MAX_BYTES } from "../../scripts/generate-doc-search-index.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { declaredActionMetadata } from "../../scripts/action-card-source.js";

const read = file => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

test("gives every declared action one exact anchor, classification, and complete option table", async () => {
  const actions = JSON.parse(await read("agent_docs/contract/ACTION_INDEX.json")).actions;
  const links = JSON.parse(await read("docs/_data/action_reference_links.json"));
  assert.equal(new Set(Object.values(links)).size, actions.length);
  const declarations = new Map((await declaredActionMetadata(actions)).map(item => [item.name, item]));
  const pages = new Map();
  for (const action of actions) {
    const [route, anchor] = links[action.name].split("#");
    const file = `docs${route.slice(0, -1)}.md`;
    if (!pages.has(file)) pages.set(file, await read(file));
    const body = pages.get(file);
    const start = body.indexOf(`## \`${action.name}\`\n`);
    assert.ok(start >= 0, action.name);
    assert.equal(anchor, action.name.toLowerCase());
    const end = body.indexOf("\n## ", start + 1);
    const entry = body.slice(start, end < 0 ? body.length : end);
    const declaration = declarations.get(action.name);
    assert.ok(entry.includes(declaration.signature), action.name);
    assert.ok(entry.includes(`**API layer:** ${action.layer}.`), action.name);
    for (const option of declaration.options) assert.ok(
      entry.includes(`| \`${option.name}\` |`), `${action.name}.${option.name}`
    );
    if (action.layer === "advanced") assert.equal(route, "/reference/actions/advanced/");
    if (action.layer === "primitive") assert.equal(route, "/reference/actions/extension/");
  }
});

test("indexes each exact action at its canonical destination within the bounded search payload", async () => {
  const source = await read("docs/search-index.json");
  assert.ok(Buffer.byteLength(source) < SEARCH_INDEX_MAX_BYTES);
  const index = JSON.parse(source);
  const links = JSON.parse(await read("docs/_data/action_reference_links.json"));
  for (const [name, route] of Object.entries(links)) {
    const entries = index.filter(entry => entry.actionName === name);
    assert.equal(entries.length, 1, name);
    assert.equal(entries[0].url, route, name);
  }
});
