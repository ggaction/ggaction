import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { INTERACTION_EDIT_TYPES } from "../../src/interaction/selection.js";
import { INTERACTION_HISTORY_TYPES } from "../../src/interaction/history.js";
import { documentationPrograms } from "../../scripts/doc-snippets.js";

// This is an execution inventory, not a substitute for browser input assertions.
test("each native edit and history command has a canonical keyboard and touch control witness", async () => {
  const cases = JSON.parse(await readFile(new URL("../support/accessible-control-cases.json", import.meta.url), "utf8"));
  const programs = await documentationPrograms();
  const commands = cases.flatMap(example => example.commands);
  assert.equal(new Set(commands).size, commands.length);
  assert.deepEqual([...commands].sort(), [...INTERACTION_EDIT_TYPES, ...INTERACTION_HISTORY_TYPES].sort());
  for (const example of cases) {
    assert.ok(programs.some(program => program.id === example.snippet), example.snippet);
    assert.deepEqual(example.inputs, ["keyboard", "touch"]);
    for (const [file, name] of [[example.browserFile, example.browserTest], [example.keyboardFile, example.keyboardTest]]) {
      if (!file) continue;
      assert.match(file, /^browser\/[a-z-]+\.browser\.js$/);
      const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
      assert.ok(source.includes(name), `${example.snippet}: ${name}`);
      assert.equal(source.split(name).length, 2, "The witness identifies one test definition.");
    }
  }
});
