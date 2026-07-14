import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ROADMAP2_ARTIFACT_ROOT,
  createRoadmap2VariantMetadata,
  validateRoadmap2VariantMetadata
} from "./artifact-paths.js";

async function readMetadata(file, identity) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Cannot read Roadmap 2 metadata ${identity}.`, {
      cause: error
    });
  }
  return validateRoadmap2VariantMetadata(parsed, identity);
}

export async function ensureRoadmap2VariantMetadata(
  artifact,
  { root = ROADMAP2_ARTIFACT_ROOT } = {}
) {
  const expected = createRoadmap2VariantMetadata(artifact);
  const directory = path.join(root, expected.chart, expected.variant);
  const file = path.join(directory, "variant.json");
  await mkdir(directory, { recursive: true });

  const existing = await readMetadata(file, expected);
  if (existing !== null) {
    if (JSON.stringify(existing) !== JSON.stringify(expected)) {
      throw new Error(
        `Conflicting Roadmap 2 metadata for ${expected.chart}/${expected.variant}.`
      );
    }
    return Object.freeze({ file, metadata: existing });
  }

  try {
    await writeFile(file, `${JSON.stringify(expected, null, 2)}\n`, {
      flag: "wx"
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const raced = await readMetadata(file, expected);
    if (JSON.stringify(raced) !== JSON.stringify(expected)) {
      throw new Error(
        `Conflicting Roadmap 2 metadata for ${expected.chart}/${expected.variant}.`
      );
    }
  }

  return Object.freeze({ file, metadata: expected });
}
