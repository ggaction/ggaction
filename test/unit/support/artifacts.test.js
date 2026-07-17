import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PNG_ARTIFACT_ROOT,
  createVariantMetadata,
  createRoadmap2VariantMetadata,
  resolvePngArtifactPath
} from "../../support/artifact-paths.js";
import {
  ensureRoadmap2VariantMetadata,
  ensureVariantMetadata
} from "../../support/artifact-metadata.js";
import { resetPngArtifacts } from "../../support/artifacts.js";
import {
  collectRoadmapVariants,
  collectRoadmap2Variants,
  generateRoadmapGallery,
  generateRoadmap2Gallery,
  renderRoadmapGallery,
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
  try {
    await writeFile(
      path.join(directory, "variant.json"),
      `${JSON.stringify({
        version: 1,
        chart,
        variant,
        title: `${chart} ${variant}`,
        userFacingCallChain: `chart().createPointMark({ id: "${chart}" });`
      }, null, 2)}\n`,
      { flag: "wx" }
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await writeFile(path.join(directory, `${kind}.png`), "png");
}

async function createRoadmap3Artifact(
  root,
  { phase, capability, chart, variant, kind }
) {
  const directory = path.join(root, capability, chart, variant);
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(
      path.join(directory, "variant.json"),
      `${JSON.stringify({
        version: 1,
        roadmap: "roadmap3",
        phase,
        capability,
        chart,
        variant,
        title: `${chart} ${variant}`,
        userFacingCallChain: `chart().createPointMark({ id: "${chart}" });`
      }, null, 2)}\n`,
      { flag: "wx" }
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await writeFile(path.join(directory, `${kind}.png`), "png");
}

test("resolves legacy, Roadmap 2, and Roadmap 3 PNG artifact paths", () => {
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
  assert.equal(
    resolvePngArtifactPath({
      artifact: {
        roadmap: "roadmap3",
        phase: "phase2",
        capability: "polar-point",
        chart: "cars-polar-scatterplot",
        variant: "baseline",
        kind: "primitive"
      }
    }),
    path.join(
      PNG_ARTIFACT_ROOT,
      "roadmap3",
      "polar-point",
      "cars-polar-scatterplot",
      "baseline",
      "primitive.png"
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
    ["roadmap", "roadmap4"],
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

test("requires Roadmap 3 phase and capability metadata", async t => {
  const root = await temporaryDirectory(t);
  const artifact = {
    roadmap: "roadmap3",
    phase: "phase2",
    capability: "polar-point",
    chart: "cars-polar-scatterplot",
    variant: "baseline",
    kind: "primitive",
    title: "Polar Point Baseline",
    userFacingCallChain: "chart().createPointMark().encodeTheta({ field: \"Acceleration\" });"
  };
  assert.deepEqual(createVariantMetadata(artifact), {
    version: 1,
    roadmap: "roadmap3",
    phase: "phase2",
    capability: "polar-point",
    chart: "cars-polar-scatterplot",
    variant: "baseline",
    title: "Polar Point Baseline",
    userFacingCallChain: "chart().createPointMark().encodeTheta({ field: \"Acceleration\" });"
  });
  assert.throws(
    () => createVariantMetadata({ ...artifact, phase: undefined }),
    /artifact\.phase/
  );

  const first = await ensureVariantMetadata(artifact, { root });
  const repeated = await ensureVariantMetadata(
    { ...artifact, kind: "user-facing" },
    { root }
  );
  assert.deepEqual(repeated.metadata, first.metadata);
  assert.equal(
    first.file,
    path.join(
      root,
      "polar-point",
      "cars-polar-scatterplot",
      "baseline",
      "variant.json"
    )
  );
  await assert.rejects(
    ensureVariantMetadata(
      { ...artifact, kind: "user-facing", phase: "phase3" },
      { root }
    ),
    /Conflicting Roadmap 3 metadata/
  );
});

test("requires and preserves target call-chain metadata", async t => {
  const root = await temporaryDirectory(t);
  const artifact = {
    roadmap: "roadmap2",
    chart: "cars-scatterplot",
    variant: "scale-policies",
    kind: "primitive",
    title: "Scale Policies",
    userFacingCallChain: "chart().editScale({ id: \"x\", reverse: true });"
  };
  assert.deepEqual(createRoadmap2VariantMetadata(artifact), {
    version: 1,
    chart: "cars-scatterplot",
    variant: "scale-policies",
    title: "Scale Policies",
    userFacingCallChain: "chart().editScale({ id: \"x\", reverse: true });"
  });
  assert.throws(
    () => createRoadmap2VariantMetadata({
      ...artifact,
      userFacingCallChain: " "
    }),
    /userFacingCallChain must be a non-empty string/
  );

  const first = await ensureRoadmap2VariantMetadata(artifact, { root });
  const repeated = await ensureRoadmap2VariantMetadata(
    { ...artifact, kind: "user-facing" },
    { root }
  );
  assert.deepEqual(repeated.metadata, first.metadata);
  await assert.rejects(
    ensureRoadmap2VariantMetadata(
      { ...artifact, kind: "user-facing", title: "Conflicting title" },
      { root }
    ),
    /Conflicting Roadmap 2 metadata/
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

test("requires metadata beside every visible primitive", async t => {
  const root = await temporaryDirectory(t);
  const directory = path.join(root, "chart", "variant");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "primitive.png"), "png");

  await assert.rejects(
    collectRoadmap2Variants(root),
    /missing variant\.json/
  );
});

test("renders an escaped responsive gallery and writes relative image paths", async t => {
  const escaped = renderRoadmap2Gallery([{
    chart: "<unsafe>",
    variant: "a&b",
    title: "<Title>",
    userFacingCallChain: "chart().encodeX({ field: \"a&b\" });",
    primitive: "./a&b/primitive.png",
    userFacing: null,
    status: "Awaiting visual confirmation"
  }]);
  assert.doesNotMatch(escaped, /<unsafe>/);
  assert.match(escaped, /&lt;unsafe&gt;/);
  assert.match(escaped, /&lt;Title&gt;/);
  assert.match(escaped, /a&amp;b/);
  assert.match(escaped, /Target user-facing call chain/);
  assert.match(escaped, /chart\(\)\.encodeX/);
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
  assert.match(html, /Target user-facing call chain/);
});

test("collects and renders Roadmap 3 capability hierarchy", async t => {
  const root = await temporaryDirectory(t);
  await createRoadmap3Artifact(root, {
    phase: "phase2",
    capability: "polar-point",
    chart: "cars-polar-scatterplot",
    variant: "baseline",
    kind: "primitive"
  });
  await createRoadmap3Artifact(root, {
    phase: "phase2",
    capability: "polar-point",
    chart: "cars-polar-scatterplot",
    variant: "baseline",
    kind: "user-facing"
  });
  await createRoadmap3Artifact(root, {
    phase: "phase6",
    capability: "program-composition",
    chart: "two-chart-dashboard",
    variant: "horizontal",
    kind: "primitive"
  });

  const variants = await collectRoadmapVariants({ roadmap: "roadmap3", root });
  assert.deepEqual(
    variants.map(item => [
      item.capability,
      item.chart,
      item.variant,
      item.phase,
      item.status
    ]),
    [
      [
        "polar-point",
        "cars-polar-scatterplot",
        "baseline",
        "phase2",
        "Ready for equivalence review"
      ],
      [
        "program-composition",
        "two-chart-dashboard",
        "horizontal",
        "phase6",
        "Awaiting visual confirmation"
      ]
    ]
  );
  assert.equal(
    variants[0].primitive,
    "./polar-point/cars-polar-scatterplot/baseline/primitive.png"
  );

  const html = renderRoadmapGallery(variants, { roadmap: "roadmap3" });
  assert.match(html, /Roadmap 3 Visual Gallery/);
  assert.match(html, /Polar Point/);
  assert.match(html, /Program Composition/);
  assert.match(
    html,
    /polar-point\/cars-polar-scatterplot\/baseline\/primitive\.png/
  );
  const output = path.join(root, "index.html");
  const generated = await generateRoadmapGallery({
    roadmap: "roadmap3",
    root,
    output
  });
  assert.equal(generated.variants.length, 2);
  assert.equal((await readFile(output, "utf8")), html);
});
