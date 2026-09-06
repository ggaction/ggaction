import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildConciseLlmDocumentation,
  buildFullLlmDocumentation,
  buildLlmManifest,
  sanitizeMarkdown
} from "../../scripts/generate-llm-docs.js";
import {
  buildDocMachineArtifacts,
  generateDocMachineArtifacts
} from "../../scripts/generate-doc-machine-artifacts.js";
import {
  buildRuntimeSignatureSection,
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
import {
  buildExamplesReadme
} from "../../scripts/generate-examples-readme.js";

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
  return markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
}

function llmReferences(source) {
  return [...source.matchAll(
    /\.\/(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+)?(?:#[A-Za-z0-9_-]+)?/g
  )].map(match => match[0]);
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
  assert.equal(navigation.length >= 30, true);

  const groups = new Set([...read("docs/_data/navigation_groups.yml").matchAll(
    /^- id:\s+(\S+)$/gm
  )].map(match => match[1]));
  const ordersByGroup = new Map();
  for (const page of registry.filter(entry => entry.nav_group)) {
    assert.equal(groups.has(page.nav_group), true, `${page.url} nav group`);
    assert.match(page.nav_order, /^\d+$/, `${page.url} nav order`);
    const orders = ordersByGroup.get(page.nav_group) ?? [];
    orders.push(page.nav_order);
    ordersByGroup.set(page.nav_group, orders);
  }
  for (const [group, orders] of ordersByGroup) {
    assert.equal(new Set(orders).size, orders.length, `${group} nav orders`);
  }

  const byUrl = new Map(registry.map(page => [page.url, page]));
  assert.equal(byUrl.get("/api/scales/")?.parent, "/api/");
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

test("keeps public facade and stabilization guidance cumulative", () => {
  const basicCharts = read("docs/api/basic-charts.md");
  for (const action of [
    "createScatterPlot",
    "createLinePlot",
    "createBarPlot",
    "createHistogram",
    "createHeatmap"
  ]) {
    assert.equal(
      basicCharts.split("\n").some(line =>
        line.startsWith("|") && line.includes(`\`${action}\``)
      ),
      true,
      `${action} facade map entry`
    );
  }
  assert.match(basicCharts, /Other complete chart facades/);
  assert.match(basicCharts, /Parallel coordinates/);
  assert.match(basicCharts, /Box plots/);
  assert.match(basicCharts, /gradient plots/i);

  assert.match(
    read("docs/api/marks/point.md"),
    /materialization uses\s+a radius of `3` logical pixels/
  );
  assert.match(
    read("docs/api/marks/line-area.md"),
    /direct quantitative line[\s\S]*`encodeX` and `encodeY` may be called in either\s+order/
  );
  assert.match(
    read("docs/api/marks/rule.md"),
    /datum y removes only inherited x[\s\S]*horizontal full-span/
  );
  assert.match(
    basicCharts,
    /Without `bin`[\s\S]*one cell for each valid\s+observed row/
  );
  assert.match(
    basicCharts,
    /Text is not automatic[\s\S]*`createTextMark\(\)\.encodeText\(\)`/
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
    assert.equal(
      existsSync(path.join(root, chart.example.replace(/^\//, ""))),
      true,
      `${chart.id} example`
    );
  }
  assert.equal(new Set(catalog.map(chart => chart.example)).size, catalog.length);
});

test("generates the public example index from the chart catalog", async () => {
  const index = read("examples/README.md");
  assert.equal(index, await buildExamplesReadme());
  assert.match(index, /This index is generated from the canonical public chart catalog/);
  assert.match(index, /Quarto and Observable JS/);
  assert.match(index, /Development fixtures/);
  for (const chart of readDocChartCatalog(read("docs/_data/chart_examples.yml"))) {
    assert.match(index, new RegExp(`\\[${chart.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`));
    assert.match(index, new RegExp(chart.example.replace(/^\/examples\//, "\\.\\/")));
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
  assert.match(read("docs/_config.yml"), /^  - jekyll-sitemap$/m);
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
  assert.match(read("docs/index.md"), /Experimental \{\{ site\.version \}\}/);
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
  const visualPattern = /!\[[^\]]+\]\([^)]+\)|(?:chart-(?:example|card)|getting-started-chart)\.html|docs-concept-flow/;
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
    ["density-area", "examples/cars-density-area/program.js", "return chart()", "## Complete program"],
    ["density-area", "examples/density-plot/program.js", "return chart()"],
    ["horizon", "examples/gapminder-horizon/program.js", "return chart()", "## Complete program"],
    ["horizon", "examples/horizon-plot/program.js", "const program = chart()"],
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

  for (const [tutorial, example, exampleStart, section] of cases) {
    const tutorialSource = read(`docs/tutorials/${tutorial}.md`);
    const exampleSource = read(example);
    if (section !== undefined) assert.equal(tutorialSource.includes(section), true, tutorial);
    assert.deepEqual(
      actionFlow(section === undefined ? tutorialSource : tutorialSource.slice(tutorialSource.indexOf(section)), "const program = chart()"),
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

  assert.match(gettingStarted, /examples\/README\.md/);
  assert.match(gettingStarted, /\/gallery\//);
  assert.match(gettingStarted, /examples\/quarto-ojs/);
  assert.doesNotMatch(gettingStarted, /examples\/cars-scatterplot/);
  assert.match(readme, /\.\/examples\/README\.md/);
  assert.match(readme, /\/tutorials\//);
  assert.match(readme, /examples\/cars-regression-scatterplot/);
  assert.equal(
    [...catalog.values()].filter(example => example.tutorial_order).length,
    13
  );
  assert.equal(
    [...catalog.values()].filter(example => example.recipe_order).length,
    19
  );
  assert.match(read("docs/tutorials/index.md"), /example\.tutorial_order/);
  assert.match(read("docs/recipes/index.md"), /example\.recipe_order/);
  assert.match(read("docs/tutorials/index.md"), /gallery-filter\.html/);
  assert.match(read("docs/recipes/index.md"), /gallery-filter\.html/);
  assert.match(read("docs/_includes/gallery-filter.html"), /data-gallery-filter="distribution"/);
  assert.match(read("docs/_includes/gallery-filter.html"), /aria-live="polite"/);
  assert.match(read("docs/_includes/chart-gallery-card.html"), /<h3>/);
  assert.match(read("docs/_includes/chart-gallery-card.html"), /action_reference_links/);
  assert.match(
    read("docs/_includes/chart-gallery-card.html"),
    /View full size: \{\{ example\.title \}\} image/
  );
  assert.match(read("docs/gallery.md"), /where: "gallery_featured", true/);
  assert.match(read("docs/gallery\/all.md"), /site\.data\.chart_examples/);
  assert.equal(
    [...catalog.values()].filter(example => example.featured === true).length,
    9
  );
  assert.match(read("docs/index.md"), /where: "featured", true/);
  assert.match(read("docs/index.md"), /toc: false/);
  assert.match(read("docs/index.md"), /Common chart types/);
  assert.equal(catalog.get("heatmap").title, "Heatmap");
  assert.equal(catalog.get("heatmap").url, "/recipes/heatmap/");
  assert.match(catalog.get("heatmap").tasks, /\bcomparison\b/);
  assert.equal(catalog.get("polar").featured, undefined);
  assert.equal(catalog.get("rose").featured, true);
  assert.equal(catalog.get("rose").url, "/recipes/rose-chart/");
  assert.equal(catalog.get("rose").recipe_url, "/recipes/rose-chart/");
  assert.match(gettingStarted, /color and shape\s+encodings also create/);
});

test("keeps the README and documentation home positioning aligned", () => {
  const readme = read("README.md").replace(/\s+/g, " ");
  const home = read("docs/index.md").replace(/\s+/g, " ");
  const messages = [
    "A grammar for how charts are made.",
    "Most visualization grammars describe a finished chart. **ggaction** represents chart authoring itself as an immutable, traceable sequence of graphical actions.",
    "Build, inspect, select, and revise charts one meaningful action at a time."
  ];

  for (const message of messages) {
    assert.equal(readme.includes(message), true, `README is missing: ${message}`);
    assert.equal(home.includes(message), true, `documentation home is missing: ${message}`);
  }
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
  assert.match(index, /data-root-url="\{\{ '\/' \| relative_url \}\}"/);
  assert.doesNotMatch(index, /entry\.content \| markdownify/);
  assert.doesNotMatch(indexPage, /entry\.content \| markdownify|layout: null|<html/i);
  assert.match(search, /fetch\(config\.dataset\.indexUrl/);
  assert.match(search, /config\.dataset\.rootUrl/);
  assert.match(search, /link\.href = new URL\(match\.url/);
  assert.doesNotMatch(search, /link\.href = match\.url/);
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
  assert.match(content, /data-action-lookup/);
  assert.match(content, /ggactionDocsActionMetadata/);
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
  assert.equal(index.every(entry => entry.summary.length > 0), true);
  assert.equal(
    index.some(entry => entry.keywords.includes("confidence interval")),
    true
  );
  assert.equal(index.length > 100, true);
  assert.equal(JSON.stringify(index).length < 800_000, true);
  assert.equal(index.every(entry => entry.keywords.every(keyword =>
    typeof keyword === "string" && keyword.length > 0
  )), true);
  assert.equal(index.every(entry => !Object.hasOwn(entry, "html")), true);
  assert.equal(index.some(entry => entry.url === "/reference/actions/guides/#editlegend"), true);
  assert.equal(index.some(entry => entry.keywords.includes("removeLegend")), true);
  assert.equal(
    index.find(entry => entry.url === "/recipes/rose-chart/")?.keywords.includes("Rose chart"),
    true
  );
  assert.equal(
    index.find(entry => entry.url === "/tutorials/polar-points/")?.keywords.includes("Polar points"),
    true
  );
  for (const [term, routes] of [
    ["PDFMetadata", ["/reference/runtime/", "/api/rendering/"]],
    ["HorizonOverflowPolicy", ["/recipes/horizon/"]],
    ["maxDisplacement", ["/api/marks/text/", "/recipes/annotations/", "/reference/actions/marks/"]],
    ["axis label rotation", ["/api/axes/"]],
    ["logarithmic scale", ["/api/scales/"]],
    ["tooltip", ["/supported-features/"]],
    ["responsive canvas", ["/responsive-charts/"]],
    ["high dpi", ["/api/rendering/"]],
    ["serialize svg", ["/api/rendering/"]],
    ["resourceNamespace", ["/api/rendering/", "/accessibility/", "/reference/runtime/"]],
    ["pie chart", ["/tutorials/polar-arcs/"]]
  ]) {
    assert.equal(index.some(entry =>
      routes.includes(entry.url.split("#")[0]) &&
      entry.keywords.some(keyword => keyword.toLowerCase() === term.toLowerCase())
    ), true, term);
  }
  const actionReference = read("docs/reference/actions.md");
  assert.match(actionReference, /data-action-lookup/);
  assert.match(actionReference, /Filter exact actions/);
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
  const include = read("docs/_includes/action-metadata.html");
  assert.match(include, /assets\/js\/action-metadata\.js/);
  assert.doesNotMatch(include, /site\.data\.action_metadata|type="application\/json"/);
  assert.match(read("docs/assets/js/action-metadata.js"), /ggactionDocsActionMetadata/);
});

test("publishes schemas, typed action cards, and declarations from canonical sources", async () => {
  await generateDocMachineArtifacts({ check: true });
  const artifacts = await buildDocMachineArtifacts();
  for (const artifact of artifacts) {
    assert.equal(
      read(artifact.destination),
      read(artifact.source),
      artifact.destination
    );
  }
  const cards = JSON.parse(read("docs/actions.json"));
  assert.equal(cards.schemaVersion, 3);
  assert.equal(cards.packageVersion, JSON.parse(read("package.json")).version);
  assert.equal(cards.count, declaredProgramMethods().length);
  assert.equal(cards.cards.every(card =>
    card.schemaVersion === 3 &&
    card.options.every(option => typeof option.type === "string" && option.type.length > 0)
  ), true);
  for (const schema of [
    "action-card.schema.json",
    "action-cards.schema.json",
    "task-packet.schema.json",
    "llms-manifest.schema.json",
    "intent-taxonomy.schema.json",
    "mcp-resources.schema.json"
  ]) {
    assert.equal(
      JSON.parse(read(`docs/schemas/${schema}`)).$id,
      `https://ggaction.github.io/ggaction/schemas/${schema}`
    );
  }
  const packageVersion = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("docs/intent-taxonomy.json")).packageVersion, packageVersion);
  assert.equal(JSON.parse(read("docs/mcp-resources.json")).packageVersion, packageVersion);
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
  const signatures = await declaredActionSignatures();
  assert.equal(signatures.length, methods.length);
  assert.equal(signatures[0], "createCanvas(options?: CanvasOptions): ChartProgram;");
  assert.equal(signatures.some(signature => /^(?:constructor|readonly\b)/.test(signature)), false);

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
  const runtime = read("docs/reference/runtime.md");
  const generatedRuntime = await buildRuntimeSignatureSection();
  const runtimeStart = runtime.indexOf("<!-- BEGIN GENERATED RUNTIME SIGNATURES -->");
  const runtimeEnd = runtime.indexOf("<!-- END GENERATED RUNTIME SIGNATURES -->");
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);
  assert.equal(
    runtime.slice(
      runtimeStart,
      runtimeEnd + "<!-- END GENERATED RUNTIME SIGNATURES -->".length
    ),
    generatedRuntime
  );
  assert.equal(
    runtime.indexOf("### Exact TypeScript signatures") <
      runtime.indexOf("## Internal trace operations"),
    true
  );
  assert.match(runtime, /Promise<PDFRenderResult>/);
  assert.match(runtime, /Promise<PNGRenderResult>/);
  assert.match(runtime, /\): string;/);
  assert.match(runtime, /^## Internal trace operations$/m);
  assert.match(runtime, /absent\s+from the public TypeScript\s+declaration/);
});

test("keeps rendering guidance executable and aligned with the Canvas contract", () => {
  const rendering = read("docs/api/rendering.md");
  const program = rendering.match(
    /^## Complete example program[\s\S]*?```javascript\n([\s\S]*?)```/m
  )?.[1];
  assert.notEqual(program, undefined);
  const executed = spawnSync(
    process.execPath,
    ["--input-type=module", "-"],
    { input: program, encoding: "utf8", cwd: root }
  );
  assert.equal(executed.status, 0, executed.stderr);
  assert.match(rendering, /Every rendering fragment below continues from/);
  assert.match(rendering, /getContext\("2d"\)/);
  assert.match(rendering, /document\.querySelector\("#svg-output"\)\.innerHTML = svg/);

  const troubleshooting = read("docs/troubleshooting.md");
  assert.match(
    troubleshooting,
    /const context = document\.querySelector\("#chart"\)\.getContext\("2d"\);\s+render\(program, context\);/
  );
  assert.doesNotMatch(
    troubleshooting,
    /render\(program, document\.querySelector\("#chart"\)\)/
  );
});

test("does not repeat identical includes in one documentation position", async () => {
  const markdownFiles = (await files(docsRoot)).filter(isDocumentationMarkdown);
  for (const file of markdownFiles) {
    let previousInclude;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const include = line.trim().match(/^\{%\s+include\s+(.+?)\s*%\}$/)?.[1];
      if (include !== undefined) {
        assert.notEqual(include, previousInclude, `${file}: duplicate include ${include}`);
        previousInclude = include;
      } else if (line.trim().length > 0) {
        previousInclude = undefined;
      }
    }
  }
});

test("keeps concise and full LLM documentation synchronized", async () => {
  const index = read("docs/llms.txt");
  const targets = llmReferences(index);
  const registry = pageRegistry();
  const routes = new Set(registry.map(page => page.url));
  const targetRoutes = new Set(targets.map(target => target.split("#")[0]));

  assert.match(index, /\.\/llms-full\.txt/);
  assert.match(index, /\.\/reference\/actions\/charts-data\//);
  assert.doesNotMatch(index, /\.md(?:#|\b)/);
  assert.equal(new Set(targets).size, targets.length);
  assert.equal(targets.length >= registry.length + 12, true);
  for (const route of routes) {
    const token = route === "/" ? "./" : `.${route}`;
    assert.equal(targetRoutes.has(token), true, `llms.txt omits ${route}`);
  }
  for (const artifact of [
    "./llms-full.txt",
    "./llms-manifest.json",
    "./actions.json",
    "./schemas/action-card.schema.json",
    "./schemas/action-cards.schema.json",
    "./schemas/task-packet.schema.json",
    "./schemas/llms-manifest.schema.json",
    "./intent-taxonomy.json",
    "./schemas/intent-taxonomy.schema.json",
    "./mcp-resources.json",
    "./schemas/mcp-resources.schema.json",
    "./types/program.d.ts"
  ]) assert.equal(targets.includes(artifact), true, artifact);
  assert.match(index, /Canvas, SVG, PNG, and PDF rendering/);
  assert.match(index, /Supported features and limitations/);
  assert.match(index, /Exact program and renderer signatures/);
  assert.match(index, /Local one-tool MCP for compact chart-authoring knowledge/);
  assert.doesNotMatch(index, /^## Current scope$/m);
  assert.equal(index, await buildConciseLlmDocumentation());
  assert.doesNotMatch(
    read(".github/workflows/ci.yml"),
    /npm run docs:(?:signatures|capabilities|images|llms)\s*$/m
  );
  assert.match(
    read(".github/workflows/release.yml"),
    /npm run docs:generate/
  );
  assert.equal(
    read("docs/llms-full.txt"),
    await buildFullLlmDocumentation()
  );
  const full = read("docs/llms-full.txt");
  const manifest = JSON.parse(read("docs/llms-manifest.json"));
  const manifestSchema = JSON.parse(read("docs/schemas/llms-manifest.schema.json"));
  const validateManifest = new Ajv2020({ strict: true }).compile(manifestSchema);
  assert.equal(
    validateManifest(manifest),
    true,
    JSON.stringify(validateManifest.errors)
  );
  assert.deepEqual(manifest, await buildLlmManifest());
  assert.equal(manifest.packageVersion, JSON.parse(read("package.json")).version);
  assert.equal(manifest.sectionCount, registry.length);
  assert.equal(manifest.sections.length, registry.length);
  assert.deepEqual(manifest.sections.map(section => section.route), registry.map(page => page.url));
  for (const section of manifest.sections) {
    assert.match(section.sha256, /^[a-f0-9]{64}$/);
    assert.equal(section.bytes > 0, true, section.route);
    assert.equal(existsSync(path.join(docsRoot, section.source)), true, section.source);
  }
  assert.equal((full.match(/^<!-- Source: /gm) ?? []).length, registry.length);
  assert.doesNotMatch(full, /\{%|\{\{/);
  assert.doesNotMatch(
    markdownWithoutCodeFences(full),
    /<(?:div|article|span|a|img|figure|details|summary)\b/i
  );
  assert.match(full, /<canvas\b/);
  assert.match(
    full,
    /\[Charts, Data, and Composition Actions[^\]]*\]\(\.\/reference\/actions\/charts-data\/\)/
  );
  const packageVersion = JSON.parse(read("package.json")).version.replaceAll(".", "\\.");
  assert.match(
    full,
    new RegExp("Package metadata version: " + packageVersion + "\\.")
  );
  assert.match(full, /A branch may contain unreleased changes/);

  const sourceByRoute = new Map((await files(docsRoot))
    .filter(isDocumentationMarkdown)
    .map(file => [prettyUrl(file), file]));
  const linkSource = markdownWithoutCodeFences(full);
  for (const match of linkSource.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|data:|javascript:)/.test(target)) continue;
    assert.match(target, /^\.\//, `non-canonical LLM link: ${target}`);
    assert.doesNotMatch(target, /\.md(?:#|$)/, target);
    const [pathname, fragment] = target.split("#");
    if (pathname.endsWith("/")) {
      const route = pathname === "./" ? "/" : `/${pathname.slice(2)}`;
      const source = sourceByRoute.get(route);
      assert.notEqual(source, undefined, `unknown LLM route ${target}`);
      if (fragment !== undefined) {
        assert.equal(
          headingIds(readFileSync(source, "utf8")).has(fragment),
          true,
          `missing LLM fragment ${target}`
        );
      }
    } else {
      assert.equal(
        existsSync(path.join(docsRoot, pathname.slice(2))),
        true,
        `missing LLM artifact ${target}`
      );
    }
  }
  for (const match of linkSource.matchAll(/!\[[^\]\n]*\]\(([^)\s]+)/g)) {
    if (!/^(?:https?:|data:)/.test(match[1])) {
      assert.match(match[1], /^\.\/assets\//, `non-canonical LLM image ${match[1]}`);
    }
  }
  assert.equal(
    sanitizeMarkdown('<div><strong>Scale</strong><span>maps values</span></div>'),
    "Scale maps values"
  );
});
