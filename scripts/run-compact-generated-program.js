import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [programFile, datasetFile, resultFile, renderer] = process.argv.slice(2);
if (!programFile || !datasetFile || !resultFile || !renderer) {
  throw new Error("Generated-program harness requires program, dataset, result and renderer args.");
}

const [module, rows] = await Promise.all([
  import(`${pathToFileURL(programFile).href}?evaluation=1`),
  readFile(datasetFile, "utf8").then(JSON.parse)
]);
if (typeof module.buildChart !== "function") {
  throw new Error("Submitted module did not export buildChart.");
}
const program = await module.buildChart(rows);
let svg = null;
if (renderer === "svg") {
  if (typeof module.renderChart !== "function") {
    throw new Error("Submitted SVG module did not export renderChart.");
  }
  svg = await module.renderChart(program);
}
await writeFile(resultFile, `${JSON.stringify({ program, svg })}\n`);
