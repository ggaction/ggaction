import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { root, run, npmCommand, tscCommand } from "./runtime.js";
import { copyCompositionRecipeExamples } from "./composition-recipes.js";

export async function testNodeConsumer(directory) {
  await copyCompositionRecipeExamples(directory);
  await writeFile(path.join(directory, "nested-responsive-public.js"),
    (await readFile(new URL("../../examples/nested-responsive/program.js", import.meta.url), "utf8"))
      .replace('"../../src/index.js"', '"ggaction"'));
  await writeFile(path.join(directory, "responsive-public.js"),
    (await readFile(new URL("../../examples/responsive-guides/program.js", import.meta.url), "utf8"))
      .replace('"../../src/index.js"', '"ggaction"'));
  await writeFile(path.join(directory, "identity-equivalence.js"),
    (await readFile(new URL("../../test/support/identity-equivalence.js", import.meta.url), "utf8"))
      .replace('"../../src/renderers/svg.js"', '"ggaction/svg"'));
  await writeFile(path.join(directory, "linear-nearest-ticks-public.js"),
    (await readFile(new URL("../../examples/linear-nearest-ticks/program.js", import.meta.url), "utf8"))
      .replace('"../../src/index.js"', '"ggaction"'));
  await writeFile(path.join(directory,"linear-nice-count-public.js"),
    (await readFile(new URL("../../examples/linear-nice-count/program.js",import.meta.url),"utf8"))
      .replace('"../../src/index.js"','"ggaction"'));
  await writeFile(path.join(directory,"facet-lane-public.js"),
    (await readFile(new URL("../../examples/facet-shared-top-lane/program.js",import.meta.url),"utf8"))
      .replace("'../../src/index.js'","'ggaction'"));
  await writeFile(path.join(directory,"plot-underlay-public.js"),
    (await readFile(new URL("../../examples/plot-guide-underlays/program.js",import.meta.url),"utf8"))
      .replace("'../../src/index.js'","'ggaction'"));
  await writeFile(path.join(directory, "facet-header-rotation.js"),
    (await readFile(new URL("../../examples/facet-header-rotation/program.js", import.meta.url), "utf8"))
      .replace('"../../src/index.js"', '"ggaction"')
      .replace('"./data.js"', '"./facet-header-data.js"'));
  await writeFile(path.join(directory, "facet-header-data.js"),
    await readFile(new URL("../../examples/facet-header-rotation/data.js", import.meta.url), "utf8"));
  await mkdir(path.join(directory, "compound-path"), {recursive:true});
  for (const file of ["program.js", "data.js", "coordinates.js"]) {
    await writeFile(path.join(directory, "compound-path", file),
      (await readFile(new URL(`../../examples/compound-path/${file}`, import.meta.url), "utf8"))
        .replace('"../../src/index.js"', '"ggaction"'));
  }
  const output = path.join(directory, "chart.png");
  const pdfOutput = path.join(directory, "chart.pdf");
  const fontWeightOutput = path.join(directory, "font-weight.png");
  const manifest = JSON.parse(await readFile(new URL("./fixtures/node/manifest.json", import.meta.url), "utf8"));
  for (const entry of manifest) {
    await writeFile(path.join(directory, entry.file), await readFile(new URL(`./fixtures/node/${entry.file}`, import.meta.url)));
  }
  const runner = `
    import { writeFile } from "node:fs/promises";
    const records = [];
    for (const file of ${JSON.stringify(manifest.map(entry => entry.file))}) {
      const { cases } = await import("./" + file);
      for (const entry of cases) {
        const start = performance.now();
        try { await entry.run(); records.push({ id: entry.id, status: "passed", durationMs: performance.now() - start }); }
        catch (error) { records.push({ id: entry.id, status: "failed", durationMs: performance.now() - start, error: error.stack }); }
      }
    }
    await writeFile("node-cases.json", JSON.stringify(records, null, 2));
    const failures = records.filter(record => record.status === "failed");
    if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
  `;
  await writeFile(path.join(directory, "consumer.mjs"), runner);
  try { run(process.execPath, ["consumer.mjs"], directory); }
  finally {
    const receipt = await readFile(path.join(directory, "node-cases.json"), "utf8").catch(() => "[]");
    await mkdir(path.join(root, ".artifacts/consumers"), { recursive: true });
    await writeFile(path.join(root, ".artifacts/consumers/node-cases.json"), receipt);
  }
  const bytes = await readFile(output);
  if (bytes.length === 0) throw new Error("Installed PNG consumer wrote an empty file.");

  const fontWeightImage = await loadImage(fontWeightOutput);
  const canvas = createCanvas(fontWeightImage.width, fontWeightImage.height);
  const context = canvas.getContext("2d");
  context.drawImage(fontWeightImage, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let firstInkY = Infinity;
  let lastInkY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if (pixels[offset] < 250 || pixels[offset + 1] < 250 || pixels[offset + 2] < 250) {
        firstInkY = Math.min(firstInkY, y);
        lastInkY = Math.max(lastInkY, y);
      }
    }
  }
  if (lastInkY === -1 || lastInkY - firstInkY + 1 > 24) {
    throw new Error("Installed PNG consumer rendered an oversized numeric font weight.");
  }
}
