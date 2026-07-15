import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDocImageManifest,
  chartImages
} from "../../scripts/generate-doc-images.js";
import { buildFullLlmDocumentation } from "../../scripts/generate-llm-docs.js";

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

function declaredProgramMethods() {
  const declaration = read("types/program.d.ts");
  const classBody = declaration.slice(declaration.indexOf("export class ChartProgram"));
  return [...classBody.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)\(/gm)]
    .map(match => match[1])
    .filter(name => name !== "constructor");
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

  const navigationSource = read("docs/_data/navigation.yml");
  assert.doesNotMatch(navigationSource, /title: (Regression|Density) Tutorial/);

  const layout = read("docs/_layouts/default.html");
  assert.equal((layout.match(/class="docs-topnav"[\s\S]*?<\/nav>/)?.[0]
    .match(/<a /g) ?? []).length, 4);
  assert.match(layout, /'\/recipes\/' \| relative_url/);
});

test("keeps tutorial action flows aligned with public examples", () => {
  const cases = [
    ["scatterplot", "examples/cars-scatterplot/program.js", "return chart()"],
    ["line-chart", "examples/cars-line-chart/program.js", "return chart()"],
    ["histogram", "examples/cars-histogram/program.js", "return chart()"],
    ["grouped-bar", "examples/jobs-grouped-bar/program.js", "return chart()"],
    [
      "regression-scatterplot",
      "examples/cars-regression-scatterplot/program.js",
      "return chart()"
    ],
    ["density-area", "examples/cars-density-area/program.js", "return chart()"]
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
    "jobs-grouped-bar",
    "cars-regression-scatterplot",
    "cars-density-area"
  ]) {
    assert.match(readme, new RegExp(`examples/${name}`));
    assert.match(gettingStarted, new RegExp(`examples/${name}`));
  }
  for (const name of [
    "scatterplot",
    "line-chart",
    "histogram",
    "grouped-bar",
    "regression-scatterplot",
    "density-area"
  ]) {
    assert.match(tutorials, new RegExp(`\\./${name}\\.md`));
  }
  const recipes = read("docs/recipes/index.md");
  for (const name of [
    "scatterplot",
    "line-chart",
    "histogram",
    "bar-chart",
    "regression-scatterplot",
    "density-area"
  ]) {
    assert.match(recipes, new RegExp(`\\./${name}\\.md`));
  }
  assert.match(gettingStarted, /point color\s+encoding can produce/);
  assert.match(gettingStarted, /examples\/getting-started/);
});

test("keeps tutorial modules runnable from a repository checkout", () => {
  const tutorials = {
    "scatterplot": "cars",
    "line-chart": "cars",
    "histogram": "cars",
    "grouped-bar": "jobs",
    "regression-scatterplot": "cars",
    "density-area": "cars"
  };

  for (const [name, dataset] of Object.entries(tutorials)) {
    const source = read(`docs/tutorials/${name}.md`);
    assert.match(source, /from "\.\.\/\.\.\/src\/index\.js"/);
    assert.match(source, new RegExp(`const ${dataset} = await response\\.json\\(\\)`));
    assert.match(source, /if \(!response\.ok\) throw new Error/);
  }

  assert.doesNotMatch(
    read("docs/recipes/scatterplot.md"),
    /Point legends are not supported/
  );
});

test("indexes documentation headings for section search", () => {
  const index = read("docs/_includes/search-index.html");
  const indexPage = read("docs/search-index.json");
  const search = read("docs/assets/js/docs-search.js");
  const layout = read("docs/_layouts/default.html");

  assert.match(index, /data-index-url/);
  assert.doesNotMatch(index, /entry\.content \| markdownify/);
  assert.match(indexPage, /entry\.content \| markdownify/);
  assert.match(indexPage, /layout: null/);
  assert.match(search, /fetch\(config\.dataset\.indexUrl/);
  assert.match(search, /input\.addEventListener\("focus"/);
  assert.match(search, /querySelectorAll\("h2\[id\], h3\[id\]"\)/);
  assert.match(search, /sectionTitle/);
  assert.match(search, /seenPages/);
  assert.match(search, /docs-search-snippet/);
  assert.match(search, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(layout, /docs-toc\.js/);
  assert.match(layout, /docs-content\.js/);
  assert.match(layout, /page-navigation\.html/);
  assert.match(layout, /docs-navigation\.js/);

  const sidebar = read("docs/_includes/sidebar.html");
  assert.match(sidebar, /role="combobox"/);
  assert.match(sidebar, /role="listbox"/);
  assert.match(sidebar, /<details class="docs-nav-group" open>/);
  assert.match(sidebar, /<summary><h2>/);

  const navigation = read("docs/assets/js/docs-navigation.js");
  assert.match(navigation, /aria-expanded/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /restoreFocus/);
  assert.match(navigation, /function syncGroups/);
});

test("keeps one generated gallery image for every public chart", async () => {
  const index = read("docs/index.md");
  const tutorials = read("docs/tutorials/index.md");

  assert.equal(chartImages.length, 6);
  for (const { id, width, height } of chartImages) {
    const image = readFileSync(path.join(root, `docs/assets/images/${id}.png`));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(image.readUInt32BE(16), width * 2, `${id} width`);
    assert.equal(image.readUInt32BE(20), height * 2, `${id} height`);
    assert.match(index, new RegExp(`assets/images/${id}\\.png`));
  }
  assert.equal((index.match(/<article>/g) ?? []).length, 6);
  assert.equal((index.match(/class="docs-chart-gallery__image"/g) ?? []).length, 6);
  assert.equal((index.match(/class="docs-chart-gallery__title"/g) ?? []).length, 6);
  assert.equal((index.match(/loading="lazy"/g) ?? []).length, 5);
  assert.equal((index.match(/loading="eager"/g) ?? []).length, 1);
  assert.equal((index.match(/<img [^>]*width="\d+"[^>]*height="\d+"/g) ?? []).length, 6);

  for (const tutorial of [
    "scatterplot",
    "line-chart",
    "histogram",
    "grouped-bar",
    "regression-scatterplot",
    "density-area"
  ]) {
    assert.match(tutorials, new RegExp(`\\./${tutorial}\\.md`));
  }

  assert.deepEqual(
    JSON.parse(read("docs/assets/images/manifest.json")),
    await buildDocImageManifest()
  );
});

test("classifies every declared ChartProgram action in the reference", () => {
  const reference = read("docs/reference/actions.md");
  const methods = declaredProgramMethods();

  assert.equal(new Set(methods).size, methods.length);
  for (const method of methods) {
    assert.match(reference, new RegExp(`\\b${method}\\b`), method);
  }

  assert.match(reference, /^## Chart Authoring API$/m);
  assert.match(reference, /^## Advanced Chart API$/m);
  assert.match(reference, /^## Extension API$/m);
  assert.match(reference, /^## Internal trace operations$/m);
  assert.match(reference, /absent from the public TypeScript\s+declaration/);
});

test("keeps concise and full LLM documentation synchronized", async () => {
  const index = read("docs/llms.txt");
  const lines = index.trim().split("\n");

  assert.equal(lines.length < 100, true);
  assert.match(index, /\.\/llms-full\.txt/);
  assert.match(index, /\.\/reference\/actions\.md/);
  assert.equal(
    read("docs/llms-full.txt"),
    await buildFullLlmDocumentation()
  );
});
