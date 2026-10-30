import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { prepareGuideTracks, validateAnimationGuides, emptyAnimationGuides, hasAnimationGuides } from "../../../src/animation/guideTracks.js";
const base = () => chart().createCanvas({ width: 500, height: 400, margin: 80 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark()
  .encodeX({ field: "x" }).encodeY({ field: "y" }).createXAxis({ ticksAndLabels: { values: [0, 10] }, title: false });
const endpoint = p => { const e = projectAnimationEndpoint(p); return { ...e, guides: projectGuideAnimationState(p, e) }; };

test("guide correspondence matches raw values across insertion and preserves component roles", () => {
  const p = base(), a = endpoint(p), b = endpoint(p.editXAxis({ ticksAndLabels: { values: [0, 5, 10] } }));
  const result = prepareGuideTracks(a, b);
  assert.equal(result.tracks.length, 5);
  assert.deepEqual(result.ambiguous, { source: [], target: [] });
  for (const track of result.tracks) assert.deepEqual(a.guides[track.sourceIndex].identity, b.guides[track.targetIndex].identity);
  assert.equal(result.tracks.filter(track => a.guides[track.sourceIndex].identity.value === 10).length, 2);
});

test("same-value label text changes crossfade while unchanged native glyphs interpolate", () => {
  const p = base(), a = endpoint(p), moved = endpoint(p.editCanvas({ width: 600 }));
  const tracks = prepareGuideTracks(a, moved).tracks;
  assert.ok(tracks.every(track => ["exact", "semantic-guide"].includes(track.kind)));
  assert.ok(tracks.some(track => track.kind === "semantic-guide"));
  const b = endpoint(p.editXAxisLabels({ labelMap: [{ value: 10, label: "Maximum" }] }));
  const fades = prepareGuideTracks(a, b).tracks.filter(track => track.kind === "crossfade");
  assert.equal(fades.length, 1);
  assert.equal(fades[0].reason, "appearance");
  assert.equal(a.guides[fades[0].sourceIndex].identity.value, 10);
});

test("duplicate ticks cannot be matched by an arbitrary first position", () => {
  const p = base().editXAxis({ ticksAndLabels: { values: [0, 0, 10], labels: { overlap: "allow" } } });
  const a = endpoint(p), result = prepareGuideTracks(a, a);
  assert.equal(result.tracks.length, 3);
  assert.equal(result.ambiguous.source.length, 4);
  assert.equal(result.ambiguous.target.length, 4);
  assert.ok(result.ambiguous.source.every(index => a.guides[index].identity.value === 0));
});

test("guide transport validates forward geometry and keeps mark identities disjoint", () => {
  const a = endpoint(base());
  assert.deepEqual(validateAnimationGuides(a.guides, a), a.guides);
  assert.ok(hasAnimationGuides(a.guides));
  assert.equal(hasAnimationGuides(emptyAnimationGuides(a)), false);
  assert.throws(() => validateAnimationGuides(a.guides.slice(1), a), /node order/);
  const index = a.guides.findIndex(state => state?.kind === "ticks");
  const corrupt = structuredClone(a.guides); corrupt[index].frame.y += 1;
  assert.throws(() => validateAnimationGuides(corrupt, a), /differs/);
  const identities = [...a.identities]; identities[index] = a.identities.find(Boolean);
  assert.throws(() => validateAnimationGuides(a.guides, { ...a, identities }), /mark identity/);
  const unsupported = endpoint(base().editXAxisLabels({ flush: true }));
  assert.equal(prepareGuideTracks(a, unsupported).tracks.filter(track => track.reason === "guide-layout").length, 2);
});

test("guide track policy changes preserve explicit fallback and never borrow missing guide metadata", () => {
  const a = endpoint(base()), index = a.guides.findIndex(state => state?.kind === "ticks");
  for (const [patch, reason] of [
    [{ type: "path" }, "primitive-kind"], [{ topology: "different" }, "topology"],
    [{ clips: [...a.scene.nodes[index].clips, [0, 0, 1, 1]] }, "clip-topology"]
  ]) {
    const nodes = [...a.scene.nodes]; nodes[index] = { ...nodes[index], ...patch };
    const result = prepareGuideTracks(a, { ...a, scene: { ...a.scene, nodes } });
    assert.equal(result.tracks.find(track => track.sourceIndex === index).reason, reason);
  }
  const guides = [...a.guides]; guides[index] = { ...guides[index], mapping: { ...guides[index].mapping,
    scale: { ...guides[index].mapping.scale, clamp: true } } };
  assert.equal(prepareGuideTracks(a, { ...a, guides }).tracks.find(track => track.sourceIndex === index).reason, "scale-clamp");
  const { guides: _guides, ...empty } = a;
  assert.deepEqual(prepareGuideTracks(empty, empty), { tracks: [], ambiguous: { source: [], target: [] } });
  assert.equal(prepareGuideTracks(a, empty).tracks.length, 0);
  const duplicated = endpoint(base().editXAxis({ ticksAndLabels: { values: [5, 5], labels: { overlap: "allow" } } }));
  assert.equal(prepareGuideTracks(empty, duplicated).ambiguous.target.length, 4);
});
