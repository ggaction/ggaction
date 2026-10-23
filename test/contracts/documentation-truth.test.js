import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { BROWSER_BUNDLE_GZIP_LIMITS } from "../../scripts/browser-bundle-size.js";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function section(source, heading) {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${heading} section`);
  const rest = source.slice(start + marker.length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

function packageSpecifiers(packageJson) {
  return Object.keys(packageJson.exports).map(entry =>
    entry === "." ? packageJson.name : `${packageJson.name}/${entry.slice(2)}`
  );
}

test("keeps current package surfaces visible in public and architecture documentation", () => {
  const packageJson = JSON.parse(read("package.json"));
  const expected = [
    ...packageSpecifiers(packageJson),
    ...Object.keys(packageJson.bin ?? {})
  ].sort();
  const readmeEntries = [...section(read("README.md"), "Package entries").matchAll(
    /^\| `([^`]+)` \|/gm
  )].map(match => match[1]).sort();
  const architectureEntries = [...section(
    read("agent_docs/SECOND_ARCHITECTURE.md"),
    "Public package boundary"
  ).matchAll(/^### `([^`]+)`$/gm)].map(match => match[1]).sort();

  assert.deepEqual(readmeEntries, expected);
  assert.deepEqual(architectureEntries, expected);
});

test("documents each shipped renderer entry at the package boundary", () => {
  const entries = JSON.parse(read("package.json")).exports;
  const architecture = read("agent_docs/SECOND_ARCHITECTURE.md");
  for (const name of ["svg", "png", "pdf"]) {
    assert.ok(entries[`./${name}`], name);
    assert.ok(architecture.includes(`ggaction/${name}`), name);
  }
});

test("keeps documented browser bundle ceilings synchronized with package checks", () => {
  const architecture = read("agent_docs/SECOND_ARCHITECTURE.md");
  const budgetSection = architecture.slice(
    architecture.indexOf("### Browser bundle regression ceilings"),
    architecture.indexOf("## `ChartProgram`의 canonical state")
  );
  const documented = Object.fromEntries([...budgetSection.matchAll(
    /^\| `([^`]+)` \| ([\d,]+) bytes \|$/gm
  )].map(match => [match[1], Number(match[2].replaceAll(",", ""))]));

  assert.deepEqual(documented, BROWSER_BUNDLE_GZIP_LIMITS);
  assert.match(
    read("README.md"),
    new RegExp(
      `at or below the current ${BROWSER_BUNDLE_GZIP_LIMITS["ggaction/basic"].toLocaleString("en-US")}` +
      "-byte gzip regression ceiling"
    )
  );
});
