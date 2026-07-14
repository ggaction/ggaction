import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PNG_ARTIFACT_ROOT,
  resolvePngArtifactPath
} from "../../support/artifact-paths.js";
import { resetPngArtifacts } from "../../support/artifacts.js";
import {
  collectRoadmap2Variants,
  generateRoadmap2Gallery,
  renderRoadmap2Gallery
} from "../../../scripts/generate-roadmap-gallery.js";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ggaction-artifacts-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function createArtifact(root, chart, variant, kind) {
  const directory = path.join(root, chart, variant);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${kind}.png`), "png");
}

test("resolves legacy and Roadmap 2 PNG artifact paths", () => {
  assert.equal(
    resolvePngArtifactPath({ name: "cars-scatterplot" }),
    path.join(PNG_ARTIFACT_ROOT, "cars-scatterplot.png")
  );
  assert.equal(
    resolvePngArtifactPath({
      artifact: {
        roadmap: "roadmap2",
        chart: "cars-scatterplot",
        variant: "shape-vocabulary",
        kind: "user-facing"
      }
    }),
    path.join(
      PNG_ARTIFACT_ROOT,
      "roadmap2",
      "cars-scatterplot",
      "shape-vocabulary",
      "user-facing.png"
    )
  );
});

test("rejects ambiguous, unknown, and unsafe artifact paths", () => {
  assert.throws(
    () => resolvePngArtifactPath({
      name: "flat",
      artifact: {
        roadmap: "roadmap2",
        chart: "chart",
        variant: "variant",
        kind: "primitive"
      }
    }),
    /either name or artifact/
  );
  for (const [key, value] of [
    ["roadmap", "roadmap3"],
    ["chart", "../chart"],
    ["variant", "Not Kebab"],
    ["kind", "public"]
  ]) {
    const artifact = {
      roadmap: "roadmap2",
      chart: "chart",
      variant: "variant",
      kind: "primitive",
      [key]: value
    };
    assert.throws(() => resolvePngArtifactPath({ artifact }));
  }
  assert.throws(
    () => resolvePngArtifactPath({
      artifact: {
        roadmap: "roadmap2",
        chart: "chart",
        variant: "variant",
        kind: "primitive",
        extra: true
      }
    }),
    /Unknown artifact option/
  );
});

test("recursively resets nested PNG artifacts", async t => {
  const root = await temporaryDirectory(t);
  await createArtifact(root, "chart", "variant", "primitive");
  await writeFile(path.join(root, "legacy.png"), "png");

  await resetPngArtifacts(root);

  assert.deepEqual(await readdir(root), []);
});

test("collects Roadmap 2 variants deterministically and records pair state", async t => {
  const root = await temporaryDirectory(t);
  await createArtifact(root, "z-chart", "default", "primitive");
  await createArtifact(root, "a-chart", "ready", "primitive");
  await createArtifact(root, "a-chart", "ready", "user-facing");
  await createArtifact(root, "a-chart", "awaiting", "primitive");

  const variants = await collectRoadmap2Variants(root);

  assert.deepEqual(
    variants.map(item => [item.chart, item.variant, item.status]),
    [
      ["a-chart", "awaiting", "Awaiting visual confirmation"],
      ["a-chart", "ready", "Ready for equivalence review"],
      ["z-chart", "default", "Awaiting visual confirmation"]
    ]
  );
  assert.equal(variants[0].userFacing, null);
  assert.equal(
    variants[1].userFacing,
    "./a-chart/ready/user-facing.png"
  );
});

test("rejects a user-facing artifact without its primitive", async t => {
  const root = await temporaryDirectory(t);
  await createArtifact(root, "chart", "variant", "user-facing");

  await assert.rejects(
    collectRoadmap2Variants(root),
    /user-facing\.png without primitive\.png/
  );
});

test("renders an escaped responsive gallery and writes relative image paths", async t => {
  const escaped = renderRoadmap2Gallery([{
    chart: "<unsafe>",
    variant: "a&b",
    primitive: "./a&b/primitive.png",
    userFacing: null,
    status: "Awaiting visual confirmation"
  }]);
  assert.doesNotMatch(escaped, /<unsafe>/);
  assert.match(escaped, /&lt;unsafe&gt;/);
  assert.match(escaped, /a&amp;b/);
  assert.match(escaped, /@media \(max-width: 760px\)/);

  const root = await temporaryDirectory(t);
  await createArtifact(root, "cars-scatterplot", "baseline", "primitive");
  await createArtifact(root, "cars-scatterplot", "baseline", "user-facing");
  const output = path.join(root, "index.html");

  const result = await generateRoadmap2Gallery({ root, output });
  const html = await readFile(output, "utf8");

  assert.equal(result.variants.length, 1);
  assert.match(html, /Roadmap 2 Visual Gallery/);
  assert.match(html, /\.\/cars-scatterplot\/baseline\/primitive\.png/);
  assert.match(html, /\.\/cars-scatterplot\/baseline\/user-facing\.png/);
});
