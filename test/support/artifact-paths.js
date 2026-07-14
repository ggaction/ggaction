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
  const allowed = new Set(["roadmap", "chart", "variant", "kind"]);
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
