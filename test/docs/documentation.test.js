import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

function isDocumentationMarkdown(file) {
  return file.endsWith(".md") && path.basename(file) !== "AGENTS.md";
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

function markdownWithoutCodeFences(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function referenceSection(reference, heading, nextHeading) {
  const start = reference.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, heading);
  const end = nextHeading === undefined
    ? reference.length
    : reference.indexOf(`## ${nextHeading}`, start + 1);
  assert.notEqual(end, -1, nextHeading);
  return reference.slice(start, end);
}

function documentedCalls(markdown) {
  const code = [...markdown.matchAll(/```[^\n]*\n([\s\S]*?)```|`([^`]+)`/g)]
    .map(match => match[1] ?? match[2])
    .join("\n");
  return new Set([...code.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*\(/g)]
    .map(match => match[1]));
}

test("keeps every local Markdown link and anchor valid", async () => {
  const markdownFiles = [
    path.join(root, "README.md"),
    ...(await files(docsRoot)).filter(isDocumentationMarkdown)
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
  const pages = (await files(docsRoot)).filter(isDocumentationMarkdown);
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

test("keeps every Markdown page structurally readable", async () => {
  const pages = (await files(docsRoot)).filter(isDocumentationMarkdown);
  for (const file of pages) {
    const markdown = readFileSync(file, "utf8");
    const frontMatter = markdown.match(/^---\n([\s\S]*?)\n---\n/);
    assert.notEqual(frontMatter, null, `${file} front matter`);
    assert.match(frontMatter[1], /^layout: default$/m, `${file} layout`);
    assert.match(frontMatter[1], /^title: .+$/m, `${file} title`);
    const visible = markdownWithoutCodeFences(markdown);
    const headings = [...visible.matchAll(/^(#{1,6})\s+(.+)$/gm)];
    assert.equal(headings.filter(match => match[1].length === 1).length, 1, file);
    let previous = 0;
    for (const heading of headings) {
      const level = heading[1].length;
      assert.equal(previous === 0 || level <= previous + 1, true, `${file}: ${heading[2]}`);
      previous = level;
    }
  }
});

test("keeps repository source links and raw images verifiable", async () => {
  const pages = (await files(docsRoot)).filter(isDocumentationMarkdown);
  for (const file of pages) {
    const markdown = readFileSync(file, "utf8");
    for (const match of markdown.matchAll(
      /https:\/\/github\.com\/hj-n\/ggaction\/(?:blob|tree)\/main\/([^ )#]+)/g
    )) {
      assert.equal(
        existsSync(path.join(root, decodeURIComponent(match[1]))),
        true,
        `${file} links to missing repository path ${match[1]}`
      );
    }
    for (const match of markdown.matchAll(/<img\b([^>]*)>/g)) {
      assert.match(match[1], /\balt="[^"]+"/, `${file} image alt`);
      assert.match(match[1], /\bwidth="\d+"/, `${file} image width`);
      assert.match(match[1], /\bheight="\d+"/, `${file} image height`);
      assert.match(match[1], /\bloading="(?:eager|lazy)"/, `${file} image loading`);
    }
  }
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
    ["density-area", "examples/cars-density-area/program.js", "return chart()"],
    ["error-bar", "examples/cars-error-bar/program.js", "return chart()"],
    [
      "error-band",
      "examples/gapminder-error-band/program.js",
      "return chart()"
    ]
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
    "cars-density-area",
    "cars-error-bar",
    "gapminder-error-band",
    "cars-box-plot",
    "mark-selection"
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
    "density-area",
    "error-bar",
    "error-band",
    "mark-selection"
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
    "density-area",
    "error-bar",
    "error-band"
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
    "density-area": "cars",
    "error-bar": "cars",
    "error-band": "gapminder"
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

  const sections = [
    referenceSection(reference, "Chart Authoring API", "Advanced Chart API"),
    referenceSection(reference, "Advanced Chart API", "Extension API"),
    referenceSection(reference, "Extension API", "Internal trace operations")
  ].map(documentedCalls);
  for (const method of methods) {
    assert.equal(
      sections.filter(section => section.has(method)).length,
      1,
      `${method} must have one canonical reference section`
    );
  }
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
