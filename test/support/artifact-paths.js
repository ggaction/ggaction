import path from "node:path";

import {
  PNG_ARTIFACT_ROOT,
  artifactTrackConfig
} from "./artifact-schema.js";

export { PNG_ARTIFACT_ROOT } from "./artifact-schema.js";

export const ROADMAP2_ARTIFACT_ROOT = artifactTrackConfig("roadmap2").root;
export const ROADMAP3_ARTIFACT_ROOT = artifactTrackConfig("roadmap3").root;
export const ROADMAP4_ARTIFACT_ROOT = artifactTrackConfig("roadmap4").root;

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARTIFACT_KINDS = new Set(["primitive", "user-facing"]);
const COMMON_ARTIFACT_KEYS = Object.freeze([
  "roadmap", "kind", "title", "userFacingCallChain"
]);

function assertSegment(value, label) {
  if (typeof value !== "string" || !SEGMENT.test(value)) {
    throw new TypeError(`${label} must be a non-empty kebab-case string.`);
  }
  return value;
}

function assertNonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function artifactConfig(roadmap) {
  return artifactTrackConfig(roadmap);
}

function assertExactKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every(key => keys.includes(key))
  ) {
    throw new TypeError(`${label} has unknown or missing keys.`);
  }
}

function assertArtifact(artifact) {
  if (
    artifact === null ||
    typeof artifact !== "object" ||
    Array.isArray(artifact)
  ) {
    throw new TypeError("artifact must be an object.");
  }
  const config = artifactConfig(artifact.roadmap);
  const allowed = new Set([
    ...COMMON_ARTIFACT_KEYS,
    ...config.pathKeys,
    ...config.scopeKeys
  ]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`Unknown artifact option "${key}".`);
    }
  }
  const identity = Object.fromEntries(
    config.pathKeys.map(key => [
      key,
      assertSegment(artifact[key], `artifact.${key}`)
    ])
  );
  return Object.freeze({ config, identity });
}

export function resolvePngArtifactPath({ name, artifact } = {}) {
  if (name !== undefined && artifact !== undefined) {
    throw new TypeError("Provide either name or artifact, not both.");
  }

  if (name !== undefined) {
    return path.join(PNG_ARTIFACT_ROOT, `${assertSegment(name, "name")}.png`);
  }

  const { config, identity } = assertArtifact(artifact);
  if (!ARTIFACT_KINDS.has(artifact.kind)) {
    throw new TypeError(
      'artifact.kind must be "primitive" or "user-facing".'
    );
  }
  return path.join(
    config.root,
    ...config.pathKeys.map(key => identity[key]),
    `${artifact.kind}.png`
  );
}

export function createVariantMetadata(artifact) {
  const { config, identity } = assertArtifact(artifact);
  resolvePngArtifactPath({ artifact });
  const common = {
    version: 1,
    ...identity,
    title: assertNonEmptyText(artifact.title, "artifact.title"),
    userFacingCallChain: assertNonEmptyText(
      artifact.userFacingCallChain,
      "artifact.userFacingCallChain"
    )
  };
  const scope = Object.fromEntries(config.scopeKeys.map(key => [
    key,
    assertSegment(artifact[key], `artifact.${key}`)
  ]));
  return Object.freeze({
    version: common.version,
    ...(config.includeTrackInMetadata ? { roadmap: artifact.roadmap } : {}),
    ...scope,
    ...identity,
    title: common.title,
    userFacingCallChain: common.userFacingCallChain
  });
}

export function validateVariantMetadata(metadata, identity) {
  const roadmap = identity?.roadmap ?? "roadmap2";
  const config = artifactConfig(roadmap);
  const label = `${config.label} variant metadata`;
  assertExactKeys(metadata, config.metadataKeys, label);
  if (metadata.version !== 1) {
    throw new TypeError(`${label} version must be 1.`);
  }
  if (config.includeTrackInMetadata && metadata.roadmap !== roadmap) {
    throw new TypeError(`${config.label} variant metadata roadmap must be "${roadmap}".`);
  }
  for (const key of config.pathKeys) {
    if (metadata[key] !== identity[key]) {
      const expected = config.pathKeys.map(name => identity[name]).join("/");
      throw new TypeError(`${label} identity must match ${expected}.`);
    }
  }
  return createVariantMetadata({
    roadmap,
    ...Object.fromEntries(config.pathKeys.map(key => [key, identity[key]])),
    ...Object.fromEntries(config.scopeKeys.map(key => [key, metadata[key]])),
    kind: "primitive",
    title: metadata.title,
    userFacingCallChain: metadata.userFacingCallChain
  });
}

export function createRoadmap2VariantMetadata(artifact) {
  return createVariantMetadata(artifact);
}

export function validateRoadmap2VariantMetadata(metadata, identity) {
  return validateVariantMetadata(metadata, { roadmap: "roadmap2", ...identity });
}
