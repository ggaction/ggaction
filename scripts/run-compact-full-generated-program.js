import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { createCanvas } from "@napi-rs/canvas";

const [programFile, datasetFile, resultFile, renderer, outputFile] = process.argv.slice(2);
if (!programFile || !datasetFile || !resultFile || !renderer || !outputFile) {
  throw new Error("Full generated-program harness requires program, dataset, result, renderer and output args.");
}

const [module, rows] = await Promise.all([
  import(`${pathToFileURL(programFile).href}?evaluation=1`),
  readFile(datasetFile, "utf8").then(JSON.parse)
]);
if (typeof module.buildChart !== "function") {
  throw new Error("Submitted module did not export buildChart.");
}
if (typeof module.renderChart !== "function") {
  throw new Error("Submitted module did not export renderChart.");
}

const program = await module.buildChart(rows);
const before = JSON.stringify(program);
let output;
if (renderer === "canvas") {
  const canvas = createCanvas(1, 1);
  output = await module.renderChart(program, canvas.getContext("2d"));
  await writeFile(outputFile, canvas.toBuffer("image/png"));
} else if (renderer === "svg") {
  output = await module.renderChart(program);
  if (typeof output === "string") await writeFile(outputFile, output);
} else {
  output = await module.renderChart(program, outputFile);
}

await writeFile(resultFile, `${JSON.stringify({
  program,
  rendererMutatedProgram: before !== JSON.stringify(program),
  renderResult: output ?? null
})}\n`);
