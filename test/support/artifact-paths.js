import path from "node:path";
import { fileURLToPath } from "node:url";

export const PNG_ARTIFACT_ROOT = fileURLToPath(
  new URL("../../.artifacts/test/png/", import.meta.url)
);

export const ROADMAP2_ARTIFACT_ROOT = path.join(
  PNG_ARTIFACT_ROOT,
  "roadmap2"
);

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROADMAP2_KINDS = new Set(["primitive", "user-facing"]);

function assertSegment(value, label) {
  if (typeof value !== "string" || !SEGMENT.test(value)) {
    throw new TypeError(`${label} must be a non-empty kebab-case string.`);
  }
  return value;
}

function assertArtifactKeys(artifact) {
  if (
    artifact === null ||
    typeof artifact !== "object" ||
    Array.isArray(artifact)
  ) {
    throw new TypeError("artifact must be an object.");
  }
  const allowed = new Set([
    "roadmap",
    "chart",
    "variant",
    "kind",
    "title",
    "userFacingCallChain"
  ]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`Unknown artifact option "${key}".`);
    }
  }
}

export function resolvePngArtifactPath({ name, artifact } = {}) {
  if (name !== undefined && artifact !== undefined) {
    throw new TypeError("Provide either name or artifact, not both.");
  }

  if (name !== undefined) {
    return path.join(
      PNG_ARTIFACT_ROOT,
      `${assertSegment(name, "name")}.png`
    );
  }

  assertArtifactKeys(artifact);
  if (artifact.roadmap !== "roadmap2") {
    throw new TypeError('artifact.roadmap must be "roadmap2".');
  }
  const chart = assertSegment(artifact.chart, "artifact.chart");
  const variant = assertSegment(artifact.variant, "artifact.variant");
  if (!ROADMAP2_KINDS.has(artifact.kind)) {
    throw new TypeError(
      'artifact.kind must be "primitive" or "user-facing".'
    );
  }

  return path.join(
    ROADMAP2_ARTIFACT_ROOT,
    chart,
    variant,
    `${artifact.kind}.png`
  );
}

function assertNonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function createRoadmap2VariantMetadata(artifact) {
  resolvePngArtifactPath({ artifact });
  return Object.freeze({
    version: 1,
    chart: artifact.chart,
    variant: artifact.variant,
    title: assertNonEmptyText(artifact.title, "artifact.title"),
    userFacingCallChain: assertNonEmptyText(
      artifact.userFacingCallChain,
      "artifact.userFacingCallChain"
    )
  });
}

export function validateRoadmap2VariantMetadata(
  metadata,
  { chart, variant }
) {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new TypeError("Roadmap 2 variant metadata must be an object.");
  }
  const expectedKeys = [
    "version",
    "chart",
    "variant",
    "title",
    "userFacingCallChain"
  ];
  const keys = Object.keys(metadata).sort();
  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every(key => keys.includes(key))
  ) {
    throw new TypeError("Roadmap 2 variant metadata has unknown or missing keys.");
  }
  if (metadata.version !== 1) {
    throw new TypeError("Roadmap 2 variant metadata version must be 1.");
  }
  if (metadata.chart !== chart || metadata.variant !== variant) {
    throw new TypeError(
      `Roadmap 2 metadata identity must match ${chart}/${variant}.`
    );
  }

  return createRoadmap2VariantMetadata({
    roadmap: "roadmap2",
    chart,
    variant,
    kind: "primitive",
    title: metadata.title,
    userFacingCallChain: metadata.userFacingCallChain
  });
}
