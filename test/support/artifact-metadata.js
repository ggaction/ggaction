import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ROADMAP2_ARTIFACT_ROOT,
  ROADMAP3_ARTIFACT_ROOT,
  createVariantMetadata,
  validateVariantMetadata
} from "./artifact-paths.js";

function roadmapLabel(roadmap) {
  return roadmap === "roadmap2" ? "Roadmap 2" : "Roadmap 3";
}

function identityFor(artifact) {
  return artifact.roadmap === "roadmap2"
    ? { roadmap: "roadmap2", chart: artifact.chart, variant: artifact.variant }
    : {
        roadmap: "roadmap3",
        capability: artifact.capability,
        chart: artifact.chart,
        variant: artifact.variant
      };
}

function directoryFor(root, artifact) {
  return artifact.roadmap === "roadmap2"
    ? path.join(root, artifact.chart, artifact.variant)
    : path.join(root, artifact.capability, artifact.chart, artifact.variant);
}

async function readMetadata(file, identity) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(
      `Cannot read ${roadmapLabel(identity.roadmap)} metadata ${Object.values(identity).slice(1).join("/")}.`,
      { cause: error }
    );
  }
  return validateVariantMetadata(parsed, identity);
}

export async function ensureVariantMetadata(artifact, { root } = {}) {
  const expected = createVariantMetadata(artifact);
  const artifactRoot = root ?? (
    artifact.roadmap === "roadmap2"
      ? ROADMAP2_ARTIFACT_ROOT
      : ROADMAP3_ARTIFACT_ROOT
  );
  const identity = identityFor(artifact);
  const identityLabel = Object.values(identity).slice(1).join("/");
  const directory = directoryFor(artifactRoot, artifact);
  const file = path.join(directory, "variant.json");
  await mkdir(directory, { recursive: true });

  const existing = await readMetadata(file, identity);
  if (existing !== null) {
    if (JSON.stringify(existing) !== JSON.stringify(expected)) {
      throw new Error(
        `Conflicting ${roadmapLabel(artifact.roadmap)} metadata for ${identityLabel}.`
      );
    }
    return Object.freeze({ file, metadata: existing });
  }

  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(expected, null, 2)}\n`, {
    flag: "wx"
  });
  try {
    await link(temporary, file);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const raced = await readMetadata(file, identity);
    if (JSON.stringify(raced) !== JSON.stringify(expected)) {
      throw new Error(
        `Conflicting ${roadmapLabel(artifact.roadmap)} metadata for ${identityLabel}.`
      );
    }
  } finally {
    await unlink(temporary);
  }

  return Object.freeze({ file, metadata: expected });
}

export function ensureRoadmap2VariantMetadata(artifact, options) {
  return ensureVariantMetadata(artifact, options);
}
