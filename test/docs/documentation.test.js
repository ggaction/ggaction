import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const docsRoot = path.join(root, "docs");

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

function prettyUrl(file) {
  const relative = path.relative(docsRoot, file).replaceAll(path.sep, "/");
  if (relative === "index.md") return "/";
  if (relative.endsWith("/index.md")) {
    return `/${relative.slice(0, -"index.md".length)}`;
  }
  return `/${relative.replace(/\.md$/, "")}/`;
}

function dataUrls(relative) {
  return [...read(relative).matchAll(/^\s+url:\s+(\S+)\s*$/gm)]
    .map(match => match[1]);
}

function headingIds(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match =>
    match[1]
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
  ));
}

function actionFlow(source, start) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing action-chain start: ${start}`);
  const chain = source.slice(from);
  const end = chain.indexOf(";\n");
  assert.notEqual(end, -1, "Action chain must end with a semicolon.");
  return [...chain.slice(0, end).matchAll(/\.([A-Za-z][A-Za-z0-9]*)\s*\(/g)]
    .map(match => match[1]);
}

test("keeps every local Markdown link and anchor valid", async () => {
  const markdownFiles = [
    path.join(root, "README.md"),
    ...(await files(docsRoot)).filter(file => file.endsWith(".md"))
  ];

  for (const file of markdownFiles) {
    const markdown = readFileSync(file, "utf8");
    for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target) || target.startsWith("#")) continue;
      const [relative, anchor] = target.split("#");
      const resolved = path.resolve(path.dirname(file), relative);
      assert.equal(existsSync(resolved), true, `${file} links to missing ${target}`);
      if (anchor && resolved.endsWith(".md")) {
        assert.equal(
          headingIds(readFileSync(resolved, "utf8")).has(anchor),
          true,
          `${file} links to missing anchor ${target}`
        );
      }
    }
  }
});

test("keeps navigation and page order complete", async () => {
  const pages = (await files(docsRoot)).filter(file => file.endsWith(".md"));
  const pageUrls = new Set(pages.map(prettyUrl));
  const navigation = dataUrls("docs/_data/navigation.yml");
  const order = dataUrls("docs/_data/page_order.yml");

  assert.equal(new Set(navigation).size, navigation.length);
  assert.equal(new Set(order).size, order.length);
  assert.deepEqual(new Set(order), pageUrls);
  for (const url of navigation) assert.equal(pageUrls.has(url), true, url);
  assert.equal(navigation.includes("/api/grids/"), true);
});

test("keeps tutorial action flows aligned with public examples", () => {
  const cases = [
    ["scatterplot", "examples/cars-scatterplot/program.js", "return chart()"],
    ["line-chart", "examples/cars-line-chart/program.js", "return chart()"],
    ["histogram", "examples/cars-histogram/program.js", "return chart()"],
    ["grouped-bar", "examples/jobs-grouped-bar/program.js", "return chart()"]
  ];

  for (const [tutorial, example, exampleStart] of cases) {
    const tutorialSource = read(`docs/tutorials/${tutorial}.md`);
    const exampleSource = read(example);
    assert.deepEqual(
      actionFlow(tutorialSource, "const program = chart()"),
      actionFlow(exampleSource, exampleStart),
      tutorial
    );
    assert.match(tutorialSource, /^## Key action trace$/m, tutorial);
  }
});

test("links every public chart example from entry documentation", () => {
  const readme = read("README.md");
  const gettingStarted = read("docs/getting-started.md");
  const tutorials = read("docs/tutorials/index.md");

  for (const name of [
    "cars-scatterplot",
    "cars-line-chart",
    "cars-histogram",
    "jobs-grouped-bar"
  ]) {
    assert.match(readme, new RegExp(`examples/${name}`));
    assert.match(gettingStarted, new RegExp(`examples/${name}`));
  }
  for (const name of ["scatterplot", "line-chart", "histogram", "grouped-bar"]) {
    assert.match(tutorials, new RegExp(`\\./${name}\\.md`));
  }
  const recipes = read("docs/recipes/index.md");
  for (const name of ["scatterplot", "line-chart", "histogram", "bar-chart"]) {
    assert.match(recipes, new RegExp(`\\./${name}\\.md`));
  }
  assert.match(gettingStarted, /Point-mark legends are not\s+supported yet/);
});

test("indexes documentation headings for section search", () => {
  const index = read("docs/_includes/search-index.html");
  const search = read("docs/assets/js/docs-search.js");
  const layout = read("docs/_layouts/default.html");

  assert.match(index, /entry\.content \| markdownify/);
  assert.match(search, /querySelectorAll\("h2\[id\], h3\[id\]"\)/);
  assert.match(search, /sectionTitle/);
  assert.match(layout, /docs-toc\.js/);
  assert.match(layout, /page-navigation\.html/);
});
