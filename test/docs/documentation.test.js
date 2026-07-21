import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildConciseLlmDocumentation,
  buildFullLlmDocumentation,
  sanitizeMarkdown
} from "../../scripts/generate-llm-docs.js";
import {
  buildSignatureSection,
  declaredActionSignatures
} from "../../scripts/generate-doc-signatures.js";
import {
  buildDocActionMetadata,
  generateDocActionMetadata
} from "../../scripts/generate-doc-action-metadata.js";
import {
  buildDocSearchIndex,
  generateDocSearchIndex
} from "../../scripts/generate-doc-search-index.js";
import {
  generateDocActionReference
} from "../../scripts/generate-doc-action-reference.js";
import {
  buildDocPageMetadata,
  generateDocPageMetadata
} from "../../scripts/generate-doc-page-metadata.js";
import {
  inspectDocsEnvironment
} from "../../scripts/check-docs-environment.js";
import {
  parseDocChartCatalog,
  readDocChartCatalog
} from "../../scripts/doc-chart-catalog.js";

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
  return file.endsWith(".md") &&
    !file.includes(`${path.sep}_sources${path.sep}`) &&
    !["AGENTS.md", "README.md"].includes(path.basename(file));
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

function pageRegistry() {
  const source = read("docs/_data/pages.yml");
  return [...source.matchAll(/^- title:\s+(.+)\n((?: {2}.+\n?)+)/gm)]
    .map(match => ({
      title: match[1],
      ...Object.fromEntries([...match[2].matchAll(
        /^ {2}([a-z_]+):\s*(.+)$/gm
      )].map(property => [property[1], property[2]]))
    }));
}

function chartExampleCatalog() {
  return new Map(readDocChartCatalog(read("docs/_data/chart_examples.yml"))
    .map(chart => [chart.id, chart]));
}

function headingIds(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => {
    const explicit = match[1].match(/\{#([A-Za-z][A-Za-z0-9_-]*)\}\s*$/)?.[1];
    if (explicit !== undefined) return explicit;
    return match[1]
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }));
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
  const registry = pageRegistry();
  const navigation = registry.filter(page => page.nav_group).map(page => page.url);
  const order = registry.map(page => page.url);

  assert.equal(new Set(navigation).size, navigation.length);
  assert.equal(new Set(order).size, order.length);
  assert.deepEqual(new Set(order), pageUrls);
  for (const url of navigation) assert.equal(pageUrls.has(url), true, url);
  assert.equal(navigation.includes("/api/"), true);
  assert.equal(navigation.length, 19);

  const byUrl = new Map(registry.map(page => [page.url, page]));
  for (const page of registry) {
    if (!page.parent) continue;
    assert.notEqual(byUrl.get(page.parent), undefined, `${page.url} parent`);
    assert.notEqual(page.parent, page.url, `${page.url} self parent`);
  }

  assert.equal(
    registry.filter(page => page.nav_group).some(page => /Tutorial$/.test(page.title)),
    false
  );
  assert.equal(dataUrls("docs/_data/navigation_groups.yml").length, 0);

  const layout = read("docs/_layouts/default.html");
  assert.equal((layout.match(/class="docs-topnav"[\s\S]*?<\/nav>/)?.[0]
    .match(/<a /g) ?? []).length, 4);
  assert.match(layout, /'\/recipes\/' \| relative_url/);
  assert.match(layout, /<html class="no-js"/);
  const sidebarOpeningTag = read("docs/_includes/sidebar.html").match(
    /^<aside[\s\S]*?>/
  )?.[0];
  assert.doesNotMatch(sidebarOpeningTag, /\s(?:inert|aria-hidden=)/);
  assert.match(
    read("docs/_includes/head.html"),
    /classList\.replace\("no-js", "js"\)/
  );
});

test("keeps the chart-example catalog strict and routable", async () => {
  const source = read("docs/_data/chart_examples.yml");
  const catalog = readDocChartCatalog(source);
  const pageUrls = new Map(
    (await files(docsRoot)).filter(isDocumentationMarkdown)
      .map(file => [prettyUrl(file), file])
  );

  assert.equal(catalog.length >= 20, true);
  assert.throws(
    () => parseDocChartCatalog("- id: points\n  title: Points\n  title: Again\n"),
    /repeats property "title"/
  );
  for (const chart of catalog) {
    for (const key of ["url", "recipe_url"]) {
      if (chart[key] === undefined) continue;
      const [url, fragment] = chart[key].split("#");
      const file = pageUrls.get(url);
      assert.notEqual(file, undefined, `${chart.id} ${key} route`);
      if (fragment) {
        assert.equal(
          headingIds(readFileSync(file, "utf8")).has(fragment),
          true,
          `${chart.id} ${key} fragment`
        );
      }
    }
  }
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

test("keeps documentation styles split by stable UI responsibility", () => {
  const entry = read("docs/assets/main.scss");
  const partials = [
    "base",
    "navigation",
    "content",
    "gallery",
    "page-chrome",
    "responsive"
  ];
  assert.deepEqual(
    [...entry.matchAll(/@import "docs\/([a-z-]+)";/g)].map(match => match[1]),
    partials
  );
  for (const partial of partials) {
    assert.equal(read(`docs/_sass/docs/_${partial}.scss`).length > 500, true, partial);
  }
});

test("generates unique page metadata and canonical social tags", async () => {
  await generateDocPageMetadata({ check: true });
  const metadata = await buildDocPageMetadata();
  assert.deepEqual(new Set(Object.keys(metadata)), new Set(pageRegistry().map(page => page.url)));
  for (const [url, entry] of Object.entries(metadata)) {
    assert.equal(entry.description.length >= 45, true, `${url} description`);
  }
  const head = read("docs/_includes/head.html");
  assert.match(head, /rel="canonical"/);
  assert.match(head, /property="og:image"/);
  assert.match(head, /site\.data\.page_metadata\[page\.url\]/);
  assert.match(read("docs/_config.yml"), /^url: https:\/\/ggaction\.github\.io$/m);
  assert.match(read("docs/_config.yml"), /^baseurl: \/ggaction$/m);
});

test("reports documentation environment prerequisites before building", () => {
  assert.deepEqual(inspectDocsEnvironment({
    nodeVersion: "20.19.0",
    rubyVersion: "3.2.4",
    bundleAvailable: true,
    chromiumAvailable: true
  }), []);
  const errors = inspectDocsEnvironment({
    nodeVersion: "18.20.0",
    rubyVersion: "2.6.10",
    bundleAvailable: false,
    chromiumAvailable: false
  });
  assert.equal(errors.length, 4);
  assert.match(errors.join("\n"), /Node\.js 20\+/);
  assert.match(errors.join("\n"), /Ruby 3\.2\+/);
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

test("keeps the published documentation version aligned with the package", () => {
  const packageJson = JSON.parse(read("package.json"));
  const configVersion = read("docs/_config.yml").match(/^version:\s*(\S+)$/m)?.[1];
  assert.equal(configVersion, packageJson.version);
  assert.match(read("docs/index.md"), /experimental `\{\{ site\.version \}\}`/);
  assert.equal(
    read("README.md").includes(`**Status:** \`${packageJson.version}\``),
    true
  );
});

test("documents sequential palette count consistently across scale surfaces", () => {
  const overview = read("docs/api/scales.md");
  const focused = read("docs/api/scales/continuous-color.md");
  const encoding = read("docs/api/series/color.md");

  assert.match(overview, /number of concrete gradient stops/);
  assert.match(overview, /integer of at least `2`/);
  assert.match(focused, /number of concrete gradient stops/);
  assert.match(encoding, /controls the concrete gradient-stop count/);
});

test("keeps the strict TypeScript extension example executable by package CI", () => {
  const documentation = read("docs/extension/action-authoring.md");
  const section = documentation.slice(
    documentation.indexOf("## Strict TypeScript authoring")
  );
  const documented = section.match(/```typescript\n([\s\S]*?)```/)?.[1];
  const executable = read("examples/extension-typescript/program.ts");

  assert.equal(documented, executable);
  assert.match(documentation, /strict: true/);
  assert.match(documentation, /skipLibCheck: false/);
});

test("keeps task pages visual and chart figures canonical", async () => {
  const catalog = chartExampleCatalog();
  assert.match(read("docs/_includes/chart-example.html"), /fetchpriority="high"/);
  const manifest = JSON.parse(read("docs/assets/images/manifest.json"));
  assert.equal(catalog.size >= 10, true);

  for (const [id, example] of catalog) {
    const relativeImage = example.image.replace(/^\//, "docs/");
    assert.equal(existsSync(path.join(root, relativeImage)), true, id);
    const imageId = path.basename(example.image, ".png");
    const generated = manifest.charts[imageId] ?? manifest.tutorials[imageId];
    assert.notEqual(generated, undefined, `${id} generated image`);
    assert.equal(Number(example.width), generated.width, `${id} width`);
    assert.equal(Number(example.height), generated.height, `${id} height`);
    assert.equal(example.alt.length > 0, true, `${id} alt`);
    assert.equal(example.caption.length > 0, true, `${id} caption`);
  }

  const exceptionSource = read("docs/_data/visual_exceptions.yml");
  const exceptions = new Map(
    [...exceptionSource.matchAll(/^- url: (\S+)\n\s+reason: (.+)$/gm)]
      .map(([, url, reason]) => [url, reason])
  );
  assert.deepEqual(
    [...exceptions.keys()],
    ["/reference/actions/", "/supported-features/", "/troubleshooting/"]
  );
  for (const reason of exceptions.values()) assert.equal(reason.length > 30, true);

  const pages = (await files(docsRoot)).filter(isDocumentationMarkdown);
  const visualPattern = /!\[[^\]]+\]\([^)]+\)|chart-(?:example|card)\.html|docs-concept-flow/;
  const visualDirectories = [
    `${path.sep}api${path.sep}`,
    `${path.sep}recipes${path.sep}`,
    `${path.sep}tutorials${path.sep}`,
    `${path.sep}concepts${path.sep}`,
    `${path.sep}extension${path.sep}`
  ];
  const taskPages = pages.filter(file =>
    file === path.join(docsRoot, "getting-started.md") ||
    file === path.join(docsRoot, "reference/actions.md") ||
    file === path.join(docsRoot, "supported-features.md") ||
    file === path.join(docsRoot, "troubleshooting.md") ||
    visualDirectories.some(directory => file.includes(directory))
  );
  for (const file of taskPages) {
    const markdown = readFileSync(file, "utf8");
    const relative = path.relative(docsRoot, file).replace(/\.md$/, "");
    const url = relative === "index" ? "/" : `/${relative}/`;
    if (exceptions.has(url)) continue;
    assert.match(markdown, visualPattern, `${file} needs a purposeful visual`);
    for (const match of markdown.matchAll(
      /chart-(?:example|card)\.html\s+id="([^"]+)"/g
    )) {
      assert.equal(catalog.has(match[1]), true, `${file}: ${match[1]}`);
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
    ["horizon", "examples/gapminder-horizon/program.js", "return chart()"],
    [
      "error-bar",
      "examples/cars-error-bar/program.js",
      "export function createCarsErrorBarOverlay"
    ],
    [
      "error-band",
      "examples/gapminder-error-band/program.js",
      "function createCurvedBoundaryErrorBand"
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

test("routes entry documentation to the canonical example indexes", () => {
  const readme = read("README.md");
  const gettingStarted = read("docs/getting-started.md");
  const catalog = chartExampleCatalog();

  for (const name of [
    "cars-scatterplot",
    "cars-line-chart",
    "cars-histogram",
    "jobs-grouped-bar",
    "gapminder-life-expectancy-heatmap",
    "cars-regression-scatterplot",
    "cars-density-area",
    "cars-parallel-coordinates",
    "cars-acceleration-violins",
    "cars-error-bar",
    "gapminder-error-band",
    "cars-box-plot",
    "mark-selection",
    "program-composition"
  ]) {
    assert.match(gettingStarted, new RegExp(`examples/${name}`));
  }
  assert.match(readme, /\.\/examples\/README\.md/);
  assert.match(readme, /\/tutorials\//);
  assert.match(readme, /examples\/cars-regression-scatterplot/);
  assert.equal(
    [...catalog.values()].filter(example => example.tutorial_order).length,
    13
  );
  assert.equal(
    [...catalog.values()].filter(example => example.recipe_order).length,
    18
  );
  assert.match(read("docs/tutorials/index.md"), /example\.tutorial_order/);
  assert.match(read("docs/recipes/index.md"), /example\.recipe_order/);
  assert.match(read("docs/_includes/gallery-filter.html"), /data-gallery-filter="distribution"/);
  assert.match(read("docs/gallery.md"), /where: "gallery_featured", true/);
  assert.match(read("docs/gallery\/all.md"), /site\.data\.chart_examples/);
  assert.equal(
    [...catalog.values()].filter(example => example.featured === true).length,
    9
  );
  assert.match(read("docs/index.md"), /where: "featured", true/);
  assert.match(gettingStarted, /point color\s+encoding can produce/);
  assert.match(gettingStarted, /examples\/getting-started/);
});

test("keeps complete tutorial programs portable to package consumers", () => {
  const tutorials = {
    "scatterplot": "cars",
    "line-chart": "cars",
    "histogram": "cars",
    "grouped-bar": "jobs",
    "regression-scatterplot": "cars",
    "density-area": "cars",
    "error-bar": "cars",
    "error-band": "gapminder",
    "polar-points": "cars",
    "polar-lines": "gapminder",
    "polar-arcs": "cars"
  };

  for (const [name, dataset] of Object.entries(tutorials)) {
    const source = read(`docs/tutorials/${name}.md`);
    assert.match(source, /^## Complete program$/m);
    assert.match(source, /from "ggaction"/);
    assert.doesNotMatch(source, /from "\.\.\/\.\.\/src\/index\.js"/);
    assert.match(source, new RegExp(`fetch\\("/${dataset}\\.json"\\)`));
    assert.match(source, new RegExp(`const ${dataset} = await response\\.json\\(\\)`));
    assert.match(source, /if \(!response\.ok\) throw new Error/);
    assert.match(
      source,
      new RegExp(
        `curl --fail --location https://raw\\.githubusercontent\\.com/` +
        `ggaction/ggaction/main/data/${dataset}\\.json --output public/${dataset}\\.json`
      )
    );
  }

  assert.doesNotMatch(
    read("docs/recipes/scatterplot.md"),
    /Point legends are not supported/
  );
});

test("keeps every primary recipe snippet labeled and syntactically runnable", () => {
  const catalog = chartExampleCatalog();
  const recipeUrls = [...catalog.values()]
    .filter(example => example.recipe_order !== undefined)
    .map(example => example.recipe_url);

  for (const url of recipeUrls) {
    const relative = url.replace(/^\//, "").replace(/\/$/, ".md");
    const source = read(`docs/${relative}`);
    assert.match(source, /\{% include runnable-recipe-note\.html %\}/, url);
    const primary = source.match(/```javascript\n([\s\S]*?)```/)?.[1];
    assert.notEqual(primary, undefined, `${url} primary JavaScript`);
    assert.match(primary, /from "ggaction";/, `${url} public package import`);
    const checked = spawnSync(
      process.execPath,
      ["--input-type=module", "--check", "-"],
      { input: primary, encoding: "utf8" }
    );
    assert.equal(checked.status, 0, `${url} syntax: ${checked.stderr}`);
  }
});

test("documents one shared numeric font-weight rendering policy", () => {
  const text = read("docs/api/marks/text.md");
  assert.match(text, /^## Font weights$/m);
  assert.match(text, /rounded to the\s+nearest 100/);
  assert.match(text, /`650` renders as `700`/);
  assert.match(text, /Titles, facet headers, legends, and Cartesian or Polar axis text/);

  for (const page of [
    "docs/api/titles.md",
    "docs/api/legends/editing.md",
    "docs/api/axes.md",
    "docs/advanced/axis-components.md",
    "docs/api/composition.md"
  ]) {
    assert.match(read(page), /font-weight policy/);
    assert.match(read(page), /#font-weights/);
  }
});

test("indexes documentation headings for section search", () => {
  const index = read("docs/_includes/search-index.html");
  const indexPage = read("docs/search-index.json");
  const search = read("docs/assets/js/docs-search.js");
  const layout = read("docs/_layouts/default.html");

  assert.match(index, /data-index-url/);
  assert.doesNotMatch(index, /entry\.content \| markdownify/);
  assert.doesNotMatch(indexPage, /entry\.content \| markdownify|layout: null|<html/i);
  assert.match(search, /fetch\(config\.dataset\.indexUrl/);
  assert.match(search, /input\.addEventListener\("focus"/);
  assert.match(search, /sectionTitle/);
  assert.match(search, /pageCounts/);
  assert.match(search, /docs-search-snippet/);
  assert.match(search, /aria-activedescendant/);
  assert.match(search, /aria-selected/);
  assert.match(search, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(layout, /docs-toc\.js/);
  assert.match(layout, /docs-content\.js/);
  assert.equal(
    layout.indexOf("docs-content.js") < layout.indexOf("docs-toc.js"),
    true
  );
  assert.match(layout, /page-navigation\.html/);
  assert.match(layout, /docs-navigation\.js/);

  const sidebar = read("docs/_includes/sidebar.html");
  assert.match(sidebar, /role="combobox"/);
  assert.match(sidebar, /role="listbox"/);
  assert.match(sidebar, /<details class="docs-nav-group">/);
  assert.match(sidebar, /docs-nav-group__title/);
  assert.match(sidebar, /nav-entry\.html/);
  assert.doesNotMatch(sidebar, /<summary><h2>/);
  assert.match(sidebar, /site\.data\.pages/);

  const navigation = read("docs/assets/js/docs-navigation.js");
  assert.match(navigation, /aria-expanded/);
  assert.match(navigation, /event\.key === "Escape"/);
  assert.match(navigation, /restoreFocus/);
  assert.match(navigation, /function syncGroups/);
  assert.match(navigation, /docs-nav-branch/);

  const breadcrumbs = read("docs/_includes/breadcrumbs.html");
  assert.match(breadcrumbs, /aria-label="Breadcrumb"/);
  assert.match(breadcrumbs, /current_entry\.parent/);

  const content = read("docs/assets/js/docs-content.js");
  assert.match(content, /docs-action-heading/);
  assert.match(content, /docs-action-signature/);
  assert.match(content, /docs-action-filter-input/);
  assert.match(content, /docs-action-metadata/);
  assert.doesNotMatch(content, /actionPrefixes/);
  assert.match(content, /docs-code-label/);
  assert.match(content, /role === "Output"/);

  const toc = read("docs/assets/js/docs-toc.js");
  assert.match(toc, /heading\.dataset\.tocLabel/);
  assert.match(toc, /headings\.length > 30/);
});

test("keeps the compact search index generated and action-aware", async () => {
  await generateDocSearchIndex({ check: true });
  const index = await buildDocSearchIndex();
  assert.equal(index.every(entry => typeof entry.kind === "string"), true);
  assert.equal(
    index.some(entry => entry.keywords.includes("confidence interval")),
    true
  );
  assert.equal(index.length > 100, true);
  assert.equal(JSON.stringify(index).length < 400_000, true);
  assert.equal(index.every(entry => !Object.hasOwn(entry, "html")), true);
  assert.equal(index.some(entry => entry.url === "/reference/actions/guides/#editlegend"), true);
  assert.equal(index.some(entry => entry.keywords.includes("removeLegend")), true);
});

test("keeps every public action available to documentation interactions", async () => {
  await generateDocActionMetadata({ check: true });
  const metadata = await buildDocActionMetadata();
  const catalog = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  assert.deepEqual(Object.keys(metadata), catalog.actions.map(action => action.name));
  for (const name of declaredProgramMethods()) {
    assert.notEqual(metadata[name], undefined, name);
  }
  for (const name of [
    "facet", "jitterPoints", "removeMark", "removeLegend", "removeTitle",
    "removeJitter", "replaceCompositionChild"
  ]) {
    assert.notEqual(metadata[name], undefined, name);
  }
});

test("keeps point legend support consistent across public guidance", () => {
  const troubleshooting = read("docs/troubleshooting.md");
  const supported = read("docs/supported-features.md");
  const legends = read("docs/api/legends.md");
  assert.doesNotMatch(troubleshooting, /Point color legends are currently\s+unsupported/);
  assert.match(troubleshooting, /nominal point color encoding can create/);
  assert.match(supported, /point color \+ shape/);
  assert.match(legends, /Categorical \| point, line, area, bar, rect, arc/);
});

test("classifies every declared ChartProgram action in the reference", async () => {
  await generateDocActionReference({ check: true });
  const landing = read("docs/reference/actions.md");
  const references = [
    "charts-data", "marks", "encodings", "statistics", "guides", "advanced", "extension"
  ].map(name => read(`docs/reference/actions/${name}.md`));
  const reference = references.join("\n");
  const types = read("docs/reference/types.md");
  const methods = declaredProgramMethods();
  const generated = await buildSignatureSection();
  const generatedStart = types.indexOf("<!-- BEGIN GENERATED TYPESCRIPT SIGNATURES -->");
  const generatedEnd = types.indexOf("<!-- END GENERATED TYPESCRIPT SIGNATURES -->");

  assert.notEqual(generatedStart, -1);
  assert.notEqual(generatedEnd, -1);
  assert.equal(
    types.slice(
      generatedStart,
      generatedEnd + "<!-- END GENERATED TYPESCRIPT SIGNATURES -->".length
    ),
    generated
  );
  assert.equal((await declaredActionSignatures()).length, methods.length);

  assert.equal(new Set(methods).size, methods.length);
  for (const method of methods) {
    assert.equal(
      references.filter(section => documentedCalls(section).has(method)).length,
      1,
      `${method} must have one canonical family reference`
    );
    assert.match(landing, new RegExp(`\\b${method}\\b`), method);
  }

  assert.match(landing, /^## Exact action lookup$/m);
  assert.match(read("docs/reference/runtime.md"), /^## Internal trace operations$/m);
  assert.match(read("docs/reference/runtime.md"), /absent from the public TypeScript\s+declaration/);
});

test("keeps concise and full LLM documentation synchronized", async () => {
  const index = read("docs/llms.txt");
  const lines = index.trim().split("\n");
  const targets = [...index.matchAll(
    /\.\/(?:llms-full\.txt|(?:[A-Za-z0-9_-]+\/)*(?:#[A-Za-z0-9_-]+)?)/g
  )].map(match => match[0]);

  assert.equal(lines.length < 100, true);
  assert.match(index, /\.\/llms-full\.txt/);
  assert.match(index, /\.\/reference\/actions\/charts-data\//);
  assert.doesNotMatch(index, /\.md(?:#|\b)/);
  assert.equal(targets.length, 44);
  assert.match(index, /vertical or\s+horizontal grouped statistical\/explicit error bands/);
  assert.match(index, /vertical or horizontal categorical and\s+quantitative pairings/);
  assert.doesNotMatch(index, /Polar line\/arc marks/);
  assert.equal(index, await buildConciseLlmDocumentation());
  assert.doesNotMatch(
    read(".github/workflows/ci.yml"),
    /npm run docs:(?:signatures|capabilities|images|llms)\s*$/m
  );
  assert.match(
    read(".github/workflows/release.yml"),
    /npm run docs:llms/
  );
  assert.equal(
    read("docs/llms-full.txt"),
    await buildFullLlmDocumentation()
  );
  const full = read("docs/llms-full.txt");
  assert.doesNotMatch(full, /\{%|\{\{/);
  assert.doesNotMatch(full, /<(?:div|article|span|a|img|figure|details|summary)\b/i);
  assert.match(full, /This documentation describes the experimental `0\.0\.4`\s+> release/);
  assert.equal(
    sanitizeMarkdown('<div><strong>Scale</strong><span>maps values</span></div>'),
    "Scale maps values"
  );
});
