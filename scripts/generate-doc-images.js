import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "ggaction/png";
import { createGettingStartedChart } from
  "../examples/getting-started/program.js";
import { publicExamples } from "../examples/registry.js";

const thumbnailMaxWidth = 640;

const dataFiles = Object.freeze({
  fashionTsne: new URL("../data/fashion_mnist_tsne.csv", import.meta.url),
  cars: new URL("../data/cars.json", import.meta.url),
  jobs: new URL("../data/jobs.json", import.meta.url),
  gapminder: new URL("../data/gapminder.json", import.meta.url),
  nightingaleRose: new URL("../data/nightingale_rose.json", import.meta.url),
  imdbSelected: new URL("../data/imdb_selected.json", import.meta.url)
});
const data = Object.fromEntries(await Promise.all(
  Object.entries(dataFiles).map(async ([id, file]) => [
    id,
    file.pathname.endsWith(".csv")
      ? (await readFile(file, "utf8")).trim().split(/\r?\n/).slice(1).map(line => {
        const [x, y, label, name] = line.split(",");
        return { x_pos: Number(x), y_pos: Number(y), label: Number(label), label_name: name };
      })
      : JSON.parse(await readFile(file, "utf8"))
  ])
));

function imageDefinition(chart) {
  return {
    ...chart,
    recipe: chart.createProgram.toString(),
    dataFiles: typeof chart.data === "string" ? [dataFiles[chart.data]]
      : Object.values(chart.data ?? {}).map(id => dataFiles[id]),
    createProgram: () => chart.createProgram(structuredClone(typeof chart.data === "string"
      ? data[chart.data] : Object.fromEntries(Object.entries(chart.data ?? {}).map(([key, id]) => [key, data[id]]))))
  };
}

export const chartImages = publicExamples({ docsGroup: "charts" })
  .map(imageDefinition);
export const tutorialImages = publicExamples().filter(chart => chart.docsGroup !== "charts")
  .map(imageDefinition);
export const guideImages = Object.freeze([
  Object.freeze({
    id: "getting-started",
    width: 640,
    height: 400,
    programFile: new URL(
      "../examples/getting-started/program.js",
      import.meta.url
    ),
    createProgram: createGettingStartedChart
  })
]);

const allImages = [...chartImages, ...tutorialImages, ...guideImages];

export function docThumbnailDimensions(width, height) {
  const scale = Math.min(1, thumbnailMaxWidth / width);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  }));
  return nested.flat().filter(file => file.endsWith(".js")).sort();
}

async function exampleSources(file, seen = new Set()) {
  const absolute = fileURLToPath(file);
  if (seen.has(absolute)) return seen;
  seen.add(absolute);
  if (!absolute.endsWith(".js")) return seen;
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    const dependency = new URL(match[1], file);
    if (dependency.pathname.startsWith(new URL("../src/", import.meta.url).pathname)) continue;
    if (/\.(?:js|json)$/.test(dependency.pathname)) await exampleSources(dependency, seen);
  }
  return seen;
}

export async function buildDocImageManifest() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const sharedFiles = [
    ...(await sourceFiles(resolve(root, "src"))),
    resolve(root, "package-lock.json")
  ];
  const shared = createHash("sha256");
  for (const file of sharedFiles) {
    shared.update(relative(root, file));
    shared.update(await readFile(file));
  }
  const sharedHash = shared.digest("hex");

  const imageManifest = images => Object.fromEntries(images.map(image => [
    image.id,
    {
      width: image.width * 2,
      height: image.height * 2,
      thumbnail: docThumbnailDimensions(image.width * 2, image.height * 2),
      sourceHash: undefined
    }
  ]));
  const groups = {
    charts: imageManifest(chartImages),
    tutorials: imageManifest(tutorialImages),
    guides: imageManifest(guideImages)
  };
  for (const chart of allImages) {
    const hash = createHash("sha256");
    hash.update(sharedHash);
    hash.update(`${chart.id}:${chart.width}x${chart.height}@2`);
    hash.update(chart.recipe ?? chart.createProgram.toString());
    for (const file of [...await exampleSources(chart.programFile)].sort()) {
      hash.update(relative(root, file));
      hash.update(await readFile(file));
    }
    for (const file of chart.dataFiles ?? []) hash.update(await readFile(file));
    const group = chartImages.includes(chart)
      ? groups.charts
      : tutorialImages.includes(chart)
        ? groups.tutorials
        : groups.guides;
    group[chart.id].sourceHash = hash.digest("hex");
  }

  return { version: 5, pixelRatio: 2, thumbnailMaxWidth, ...groups };
}

export async function generateDocImages() {
  for (const chart of allImages) {
    const output = fileURLToPath(
      new URL(`../docs/assets/images/${chart.id}.png`, import.meta.url)
    );
    await renderToPNG(chart.createProgram(), { output, pixelRatio: 2 });
    process.stdout.write(`generated ${chart.id}.png\n`);

    const image = await loadImage(output);
    const dimensions = docThumbnailDimensions(image.width, image.height);
    const thumbnail = createCanvas(dimensions.width, dimensions.height);
    thumbnail
      .getContext("2d")
      .drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const thumbnailOutput = fileURLToPath(
      new URL(`../docs/assets/images/${chart.id}-thumb.png`, import.meta.url)
    );
    await writeFile(thumbnailOutput, thumbnail.toBuffer("image/png"));
    process.stdout.write(`generated ${chart.id}-thumb.png\n`);
  }
  const manifest = fileURLToPath(
    new URL("../docs/assets/images/manifest.json", import.meta.url)
  );
  await writeFile(manifest, `${JSON.stringify(await buildDocImageManifest(), null, 2)}\n`);
  process.stdout.write("generated docs image manifest\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateDocImages();
}
