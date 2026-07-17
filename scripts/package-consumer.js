import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPackageArtifact } from "./package-artifact.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tscCommand = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
}

export async function preparePackageConsumer({
  packageSpec = process.env.GGACTION_PACKAGE_SPEC
} = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-consumer-"));
  const artifact = packageSpec === undefined ? await createPackageArtifact() : undefined;
  const installSpec = packageSpec ?? artifact.file;
  await writeFile(path.join(directory, "package.json"), `${JSON.stringify({
    name: "ggaction-release-consumer",
    version: "1.0.0",
    private: true,
    type: "module"
  }, null, 2)}\n`);
  run(npmCommand, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    installSpec
  ], directory);
  const installedManifest = JSON.parse(await readFile(
    path.join(directory, "node_modules", "ggaction", "package.json"),
    "utf8"
  ));
  return {
    artifact,
    directory,
    installedManifest,
    packageSpec: packageSpec ?? artifact.file,
    cleanup: () => rm(directory, { recursive: true, force: true })
  };
}

async function testNodeConsumer(directory) {
  const output = path.join(directory, "chart.png");
  const source = `
    import assert from "node:assert/strict";
    import { chart, render } from "ggaction";
    import { action, ChartProgram } from "ggaction/extension";
    import { renderToPNG } from "ggaction/png";

    const program = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeRadius({ value: 3 });
    assert.equal(typeof render, "function");
    assert.equal(program.graphicSpec.objects.point.items.length, 2);
    const result = await renderToPNG(program, {
      output: ${JSON.stringify(output)},
      pixelRatio: 1
    });
    assert.equal(result.width, 160);
    assert.equal(result.height, 120);

    class ConsumerProgram extends ChartProgram {}
    const passthrough = action(
      { op: "passthrough", description: "Return one extension program." },
      function () { return this; }
    );
    assert.equal(passthrough.call(new ConsumerProgram()) instanceof ConsumerProgram, true);

    await assert.rejects(() => import("ggaction/src/index.js"), /not defined|not exported/);
  `;
  const file = path.join(directory, "consumer.mjs");
  await writeFile(file, source);
  run(process.execPath, [file], directory);
  const bytes = await readFile(output);
  if (bytes.length === 0) throw new Error("Installed PNG consumer wrote an empty file.");
}

async function testTypeScriptConsumer(directory) {
  await writeFile(path.join(directory, "consumer.ts"), `
    import {
      chart,
      render,
      type ChartProgram,
      type CreateDerivedDataOptions,
      type DatasetTransform
    } from "ggaction";
    import { action, ChartProgram as ExtensionProgram } from "ggaction/extension";
    import { renderToPNG, type PNGRenderResult } from "ggaction/png";

    const program: ChartProgram = chart().createCanvas({ width: 100, height: 100 });
    const draw: typeof render = render;
    const png: Promise<PNGRenderResult> = renderToPNG(program, { output: "chart.png" });
    const wrapped = action(
      { op: "typed", description: "Compile one extension action." },
      function () { return this; }
    );
    const extensionProgram: ExtensionProgram = wrapped.call(new ExtensionProgram());
    const filterTransform: DatasetTransform = {
      type: "filter",
      field: "group",
      oneOf: ["A"]
    };
    const derivedOptions: CreateDerivedDataOptions = {
      id: "filtered",
      source: "source",
      transform: [filterTransform]
    };
    const derived = chart()
      .createData({ id: "source", values: [{ group: "A" }] })
      .createDerivedData(derivedOptions);
    // @ts-expect-error DatasetTransform is a closed discriminated union.
    const invalidTransform: DatasetTransform = { type: "unknown" };
    void draw;
    void png;
    void extensionProgram;
    void derived;
    void invalidTransform;
  `);
  await writeFile(path.join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      lib: ["ES2023", "DOM"],
      strict: true,
      noEmit: true,
      skipLibCheck: false
    },
    files: ["consumer.ts"]
  }, null, 2)}\n`);
  run(tscCommand, ["--project", "tsconfig.json"], directory);
}

export async function testPackageConsumer(options) {
  const consumer = await preparePackageConsumer(options);
  try {
    await testNodeConsumer(consumer.directory);
    await testTypeScriptConsumer(consumer.directory);
    return consumer;
  } finally {
    await consumer.cleanup();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageSpec = process.argv[2];
  const result = await testPackageConsumer({ packageSpec });
  process.stdout.write(`${JSON.stringify({
    package: `${result.installedManifest.name}@${result.installedManifest.version}`,
    source: packageSpec ?? result.artifact.filename,
    ...(result.artifact ? { sha256: result.artifact.sha256 } : {}),
    checks: ["node", "extension", "png", "typescript", "private-export-rejection"]
  }, null, 2)}\n`);
}
