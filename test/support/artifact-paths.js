import path from "node:path";
import { fileURLToPath } from "node:url";

export const PNG_ARTIFACT_ROOT = fileURLToPath(
  new URL("../../.artifacts/test/png/", import.meta.url)
);

export const ROADMAP2_ARTIFACT_ROOT = path.join(PNG_ARTIFACT_ROOT, "roadmap2");
export const ROADMAP3_ARTIFACT_ROOT = path.join(PNG_ARTIFACT_ROOT, "roadmap3");

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARTIFACT_KINDS = new Set(["primitive", "user-facing"]);
const COMMON_ARTIFACT_KEYS = Object.freeze([
  "roadmap",
  "chart",
  "variant",
  "kind",
  "title",
  "userFacingCallChain"
]);
const ROADMAP_CONFIGS = Object.freeze({
  roadmap2: Object.freeze({
    root: ROADMAP2_ARTIFACT_ROOT,
    identityKeys: Object.freeze(["chart", "variant"]),
    metadataKeys: Object.freeze([
      "version",
      "chart",
      "variant",
      "title",
      "userFacingCallChain"
    ])
  }),
  roadmap3: Object.freeze({
    root: ROADMAP3_ARTIFACT_ROOT,
    identityKeys: Object.freeze(["capability", "chart", "variant"]),
    metadataKeys: Object.freeze([
      "version",
      "roadmap",
      "phase",
      "capability",
      "chart",
      "variant",
      "title",
      "userFacingCallChain"
    ])
  })
});

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
  const config = ROADMAP_CONFIGS[roadmap];
  if (config === undefined) {
    throw new TypeError('artifact.roadmap must be "roadmap2" or "roadmap3".');
  }
  return config;
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
    ...(artifact.roadmap === "roadmap3" ? ["phase", "capability"] : [])
  ]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`Unknown artifact option "${key}".`);
    }
  }
  const identity = Object.fromEntries(
    config.identityKeys.map(key => [
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
    ...config.identityKeys.map(key => identity[key]),
    `${artifact.kind}.png`
  );
}

export function createVariantMetadata(artifact) {
  const { identity } = assertArtifact(artifact);
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
  if (artifact.roadmap === "roadmap2") return Object.freeze(common);
  return Object.freeze({
    version: common.version,
    roadmap: "roadmap3",
    phase: assertSegment(artifact.phase, "artifact.phase"),
    capability: common.capability,
    chart: common.chart,
    variant: common.variant,
    title: common.title,
    userFacingCallChain: common.userFacingCallChain
  });
}

export function validateVariantMetadata(metadata, identity) {
  const roadmap = identity?.roadmap ?? "roadmap2";
  const config = artifactConfig(roadmap);
  const label = `${roadmap === "roadmap2" ? "Roadmap 2" : "Roadmap 3"} variant metadata`;
  assertExactKeys(metadata, config.metadataKeys, label);
  if (metadata.version !== 1) {
    throw new TypeError(`${label} version must be 1.`);
  }
  if (roadmap === "roadmap3" && metadata.roadmap !== "roadmap3") {
    throw new TypeError('Roadmap 3 variant metadata roadmap must be "roadmap3".');
  }
  for (const key of config.identityKeys) {
    if (metadata[key] !== identity[key]) {
      const expected = config.identityKeys.map(name => identity[name]).join("/");
      throw new TypeError(`${label} identity must match ${expected}.`);
    }
  }
  return createVariantMetadata({
    roadmap,
    ...Object.fromEntries(config.identityKeys.map(key => [key, identity[key]])),
    ...(roadmap === "roadmap3" ? { phase: metadata.phase } : {}),
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
