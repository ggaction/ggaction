import path from "node:path";
import { fileURLToPath } from "node:url";

export const PNG_ARTIFACT_ROOT = fileURLToPath(
  new URL("../../.artifacts/test/png/", import.meta.url)
);

const TRACKS = Object.freeze({
  roadmap2: Object.freeze({
    id: "roadmap2",
    label: "Roadmap 2",
    number: 2,
    root: path.join(PNG_ARTIFACT_ROOT, "roadmap2"),
    scopeKeys: Object.freeze([]),
    pathKeys: Object.freeze(["chart", "variant"]),
    groupKeys: Object.freeze(["chart"]),
    includeTrackInMetadata: false,
    metadataKeys: Object.freeze([
      "version", "chart", "variant", "title", "userFacingCallChain"
    ])
  }),
  roadmap3: Object.freeze({
    id: "roadmap3",
    label: "Roadmap 3",
    number: 3,
    root: path.join(PNG_ARTIFACT_ROOT, "roadmap3"),
    scopeKeys: Object.freeze(["phase", "capability"]),
    pathKeys: Object.freeze(["capability", "chart", "variant"]),
    groupKeys: Object.freeze(["capability", "chart"]),
    includeTrackInMetadata: true,
    metadataKeys: Object.freeze([
      "version", "roadmap", "phase", "capability", "chart", "variant",
      "title", "userFacingCallChain"
    ])
  }),
  roadmap4: Object.freeze({
    id: "roadmap4",
    label: "Roadmap 4",
    number: 4,
    root: path.join(PNG_ARTIFACT_ROOT, "roadmap4"),
    scopeKeys: Object.freeze(["phase", "capability"]),
    pathKeys: Object.freeze(["capability", "chart", "variant"]),
    groupKeys: Object.freeze(["capability", "chart"]),
    includeTrackInMetadata: true,
    metadataKeys: Object.freeze([
      "version", "roadmap", "phase", "capability", "chart", "variant",
      "title", "userFacingCallChain"
    ])
  })
});

export const ARTIFACT_TRACKS = TRACKS;

export function artifactTrackNames() {
  return Object.freeze(Object.keys(TRACKS));
}

export function artifactTrackConfig(track) {
  const config = TRACKS[track];
  if (config === undefined) {
    throw new TypeError(
      `Unknown artifact track "${track}"; expected ${Object.keys(TRACKS).join(", ")}.`
    );
  }
  return config;
}
