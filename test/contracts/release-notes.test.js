import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { extractReleaseNotes } from "../../scripts/release-notes.js";

test("derives the 0.0.2 GitHub release notes from the canonical changelog", async () => {
  const changelog = await readFile(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
  const notes = extractReleaseNotes(changelog, "0.0.2");

  assert.match(notes, /^# ggaction 0\.0\.2\n/);
  assert.match(notes, /### Fixed/);
  assert.match(notes, /forbidden-file audit/);
  assert.doesNotMatch(notes, /^## \[0\.0\.1\]/m);
});

test("rejects unknown, empty, and malformed release-note requests", () => {
  assert.throws(() => extractReleaseNotes("# Changelog\n", "0.0.1"), /no release section/);
  assert.throws(() => extractReleaseNotes("## [0.0.1]\n", "0.0.1"), /is empty/);
  assert.throws(() => extractReleaseNotes("# Changelog\n", "latest"), /semantic version/);
});
