import { readFile, rm, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, transformWithEsbuild } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const entry = path.join(root, "examples/interactive-action-trace/main.js");
const sourceHtml = path.join(root, "examples/interactive-action-trace/index.html");
const outputScript = path.join(
  root,
  "docs/assets/js/interactive-action-trace.js"
);
const outputHtml = path.join(
  root,
  "docs/demos/action-trace/index.html"
);

function documentationHtml(source) {
  return source
    .replace(
      "<script type=\"module\" src=\"./main.js\"></script>",
      "<script type=\"module\" src=\"../../assets/js/interactive-action-trace.js\"></script>"
    )
    .replace(
      "<!doctype html>",
      "<!doctype html>\n<!-- Generated from examples/interactive-action-trace/index.html. -->"
    );
}

async function bundle(directory) {
  await build({
    configFile: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: directory,
      target: "es2022",
      lib: {
        entry,
        formats: ["es"],
        fileName: () => "interactive-action-trace.js"
      },
      rollupOptions: {
        output: { inlineDynamicImports: true }
      }
    }
  });
  const source = await readFile(
    path.join(directory, "interactive-action-trace.js"),
    "utf8"
  );
  const { code } = await transformWithEsbuild(
    source,
    "interactive-action-trace.js",
    { legalComments: "none", minify: true, target: "es2022" }
  );
  return code;
}

async function assertCurrent(target, expected) {
  const current = await readFile(target, "utf8").catch(() => undefined);
  if (current !== expected) {
    throw new Error(`${path.relative(root, target)} is stale; run npm run docs:trace-demo.`);
  }
}

export async function generateInteractiveActionTrace({ check = false } = {}) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-trace-demo-"));
  try {
    const [script, htmlSource] = await Promise.all([
      bundle(temporary),
      readFile(sourceHtml, "utf8")
    ]);
    const html = documentationHtml(htmlSource);
    if (check) {
      await Promise.all([
        assertCurrent(outputScript, script),
        assertCurrent(outputHtml, html)
      ]);
      return;
    }
    await Promise.all([
      mkdir(path.dirname(outputScript), { recursive: true }),
      mkdir(path.dirname(outputHtml), { recursive: true })
    ]);
    await Promise.all([
      writeFile(outputScript, script),
      writeFile(outputHtml, html)
    ]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateInteractiveActionTrace({ check: process.argv.includes("--check") });
}
