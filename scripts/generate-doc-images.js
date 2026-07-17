import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNG } from "ggaction/png";
import { publicCharts } from "../examples/registry.js";

const thumbnailMaxWidth = 640;

const dataFiles = Object.freeze({
  cars: new URL("../data/cars.json", import.meta.url),
  jobs: new URL("../data/jobs.json", import.meta.url),
  gapminder: new URL("../data/gapminder.json", import.meta.url)
});
const data = Object.fromEntries(await Promise.all(
  Object.entries(dataFiles).map(async ([id, file]) => [
    id,
    JSON.parse(await readFile(file, "utf8"))
  ])
));

function imageDefinition(chart) {
  return {
    ...chart,
    dataFile: dataFiles[chart.data],
    createProgram: () => chart.createProgram(structuredClone(data[chart.data]))
  };
}

export const chartImages = publicCharts({ docsGroup: "charts" })
  .map(imageDefinition);
export const tutorialImages = publicCharts({ docsGroup: "tutorials" })
  .map(imageDefinition);

const allImages = [...chartImages, ...tutorialImages];

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
    tutorials: imageManifest(tutorialImages)
  };
  for (const chart of allImages) {
    const hash = createHash("sha256");
    hash.update(sharedHash);
    hash.update(`${chart.width}x${chart.height}@2`);
    hash.update(await readFile(chart.programFile));
    hash.update(await readFile(chart.dataFile));
    const group = chartImages.includes(chart) ? groups.charts : groups.tutorials;
    group[chart.id].sourceHash = hash.digest("hex");
  }

  return { version: 4, pixelRatio: 2, thumbnailMaxWidth, ...groups };
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
