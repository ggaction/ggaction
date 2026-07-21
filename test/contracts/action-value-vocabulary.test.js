import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_INDEX,
  contractCorpus,
  markdownAnchors,
  readContractTarget
} from "../support/action-contracts.js";

const index = ACTION_INDEX;
const currentCorpus = contractCorpus("current");
const plannedCorpus = contractCorpus("planned");

function assertContractTarget(contract) {
  const { source } = readContractTarget(contract);
  assert.equal(
    markdownAnchors(source).includes(contract.anchor.toLowerCase()),
    true,
    `${contract.file}#${contract.anchor}`
  );
}

test("keeps accepted planned capabilities linked and non-public", () => {
  const ids = index.plannedCapabilities.map(capability => capability.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const capability of index.plannedCapabilities) {
    assert.equal(
      index.contractSchema.plannedKinds.includes(capability.kind),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedStatuses.includes(capability.status),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedReadiness.includes(capability.readiness),
      true,
      capability.name
    );
    assertContractTarget(capability.contract);
  }

  assert.match(currentCorpus, /type PointShape =/);
  assert.match(currentCorpus, /type EditableCurrentScale =/);
  assert.match(plannedCorpus, /createRuleMark\(\{/);
  assert.match(plannedCorpus, /별도 `encodeRule`\/`editRuleMark`가 아니라/);
  assert.match(plannedCorpus, /encodeStroke\(\{ target\?: UserId; value: NonEmptyString \}\)/);
  assert.match(currentCorpus, /createIntervalData\(\{/);
  assert.match(currentCorpus, /createErrorBar\(\{/);
  assert.match(currentCorpus, /vertical or horizontal orientation/);
  assert.match(currentCorpus, /ExplicitIntervalChannel/);
  assert.doesNotMatch(plannedCorpus, /createErrorBar remaining variants/);
  assert.match(currentCorpus, /createErrorBand\(\{/);
  assert.doesNotMatch(plannedCorpus, /createErrorBand\(\{/);
  assert.match(currentCorpus, /createBoxPlot\(\{/);
  assert.match(currentCorpus, /factor\?: PositiveFinite/);
  assert.match(currentCorpus, /outliers\?: boolean/);
  assert.doesNotMatch(plannedCorpus, /createBoxPlot\(\{/);
  assert.match(currentCorpus, /wrapped `createErrorBand` explicit mode/);
  assert.doesNotMatch(plannedCorpus, /regression band delegation/);
  assert.match(currentCorpus, /No `semanticSpec\.composites` registry is introduced/);
  assert.match(currentCorpus, /"plus" \| "cross" \| "star" \| "hexagon" \| "wye"/);
  assert.match(plannedCorpus, /type CurveInterpolation =/);
  assert.match(plannedCorpus, /"step-before"[\s\S]*"step-after"/);
  assert.match(plannedCorpus, /"basis"[\s\S]*"cardinal"[\s\S]*"monotone"[\s\S]*"natural"/);
  assert.match(plannedCorpus, /type ConcretePathCommand =/);
  assert.match(plannedCorpus, /uniform cubic B-spline/);
  assert.match(plannedCorpus, /Renderers execute commands only/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /curve.*Proposed|Proposed.*curve/i);
  assert.match(currentCorpus, /stroke\?: NonEmptyString \| false/);
  assert.match(currentCorpus, /band\?: number; pixels\?: never/);
  assert.match(currentCorpus, /pixels: PositiveFinite/);
  assert.match(currentCorpus, /paddingInner\?: UnitIntervalLessThan1/);
  assert.match(currentCorpus, /type ScalarAggregateOperation =/);
  assert.match(currentCorpus, /type ParameterizedAggregateOperation =/);
  assert.match(currentCorpus, /op: "quantile"; probability: UnitInterval/);
  assert.match(currentCorpus, /op: "first" \| "last"/);
  assert.match(currentCorpus, /mean ± 1\.96 \* stderr/);
  assert.match(currentCorpus, /layout\?: "stack" \| "fill" \| "group" \| "overlay" \| "diverging"/);
  assert.match(currentCorpus, /`"center"`는 Proposed/);
  assert.match(currentCorpus, /`encodeGroup`과의 distinct ownership/);
  const paletteType = currentCorpus.match(
    /type PaletteName =([\s\S]*?);\n\ntype Palette =/
  )?.[1];
  assert.ok(paletteType);
  assert.deepEqual(
    [...paletteType.matchAll(/"([^"]+)"/g)].map(match => match[1]),
    [
      "accent",
      "category10", "category20", "category20b", "category20c",
      "observable10",
      "dark2", "paired", "pastel1", "pastel2",
      "set1", "set2", "set3",
      "tableau10", "tableau20",
      "blues", "tealblues", "teals", "greens", "browns",
      "oranges", "reds", "purples", "warmgreys", "greys",
      "viridis", "magma", "inferno", "plasma", "cividis", "turbo",
      "bluegreen", "bluepurple",
      "goldgreen", "goldorange", "goldred",
      "greenblue", "orangered",
      "purplebluegreen", "purpleblue", "purplered", "redpurple",
      "yellowgreenblue", "yellowgreen", "yelloworangebrown", "yelloworangered",
      "darkblue", "darkgold", "darkgreen", "darkmulti", "darkred",
      "lightgreyred", "lightgreyteal", "lightmulti", "lightorange", "lighttealblue",
      "blueorange", "brownbluegreen", "purplegreen", "pinkyellowgreen",
      "purpleorange", "redblue", "redgrey",
      "redyellowblue", "redyellowgreen", "spectral",
      "rainbow", "sinebow"
    ]
  );
  assert.match(plannedCorpus, /count\?: PositiveInteger/);
  assert.match(plannedCorpus, /extent\?: readonly \[UnitInterval, UnitInterval\]/);
  assert.match(currentCorpus, /eight interpolation tokens/);
  assert.match(currentCorpus, /aggregate-bar quantitative auto domain/);
  assert.match(currentCorpus, /aggregate를 상속/);
  assert.match(currentCorpus, /point\/aggregate-bar consumers/);
  assert.doesNotMatch(plannedCorpus, /## continuous color bar consumer/);
  assert.match(plannedCorpus, /## continuous color gradient legend/);
  assert.match(plannedCorpus, /length\?: PositiveFinite/);
  assert.match(plannedCorpus, /adjacent rect strips/);
  assert.match(currentCorpus, /DashStyle = "solid" \| "dashed" \| "dotted" \| "dashdot"/);
  assert.match(currentCorpus, /solid → \[\]/);
  assert.match(currentCorpus, /dashed → \[6, 4\]/);
  assert.match(currentCorpus, /dotted → \[1, 3\]/);
  assert.match(currentCorpus, /dashdot → \[6, 3, 1, 3\]/);
  assert.match(currentCorpus, /encodeOpacity\(\{ value, target\? \} \| \{ field/);
  assert.match(currentCorpus, /auto linear range는 `\[0\.2, 1\]`/);
  assert.match(
    currentCorpus,
    /"color" \| "strokeDash" \| "shape" \| "size" \| "opacity"/
  );
  assert.match(currentCorpus, /gradient\?: \{ length\?: PositiveFinite; thickness\?: PositiveFinite \}/);
  assert.doesNotMatch(currentCorpus, /minArea|maxArea/);
  assert.doesNotMatch(currentCorpus, /unit\?: "radius" \| "area"/);
  assert.match(currentCorpus, /## Position field-type compatibility/);
  assert.match(currentCorpus, /Canonical owner: `src\/grammar\/positionCompatibility\.js`/);
  assert.match(currentCorpus, /Implemented values `"zero" \| "normalize" \| null`/);
  for (const heading of [
    "grouped-bar reassignment",
    "bar width",
    "color layout",
    "normalized stack",
    "offset padding"
  ]) {
    assert.doesNotMatch(
      plannedCorpus,
      new RegExp(`## Implemented ${heading} compatibility note`)
    );
  }
  assert.match(currentCorpus, /paddingOuter\?: NonNegativeFinite/);
  assert.match(currentCorpus, /## `encodeX2`/);
  assert.match(currentCorpus, /## `encodeXRange`/);
  assert.match(currentCorpus, /binBoundaries\?: readonly \[Finite, Finite, \.\.\.Finite\[\]\]/);
  assert.match(currentCorpus, /zero-anchored exact steps/);
  assert.doesNotMatch(plannedCorpus, /type PlannedScaleType =/);
  assert.match(currentCorpus, /type ScaleType =/);
  assert.match(currentCorpus, /"log"[\s\S]*"pow"[\s\S]*"sqrt"[\s\S]*"symlog"/);
  assert.match(currentCorpus, /"symlog"[\s\S]*"band"[\s\S]*"point"/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /"utc"/);
  assert.match(currentCorpus, /"point"[\s\S]*"sequential"[\s\S]*"quantize"/);
  assert.match(currentCorpus, /"quantize"[\s\S]*"quantile"[\s\S]*"threshold"/);
  assert.match(currentCorpus, /clamp\?: boolean/);
  assert.match(currentCorpus, /reverse\?: boolean/);
  assert.match(currentCorpus, /unknown\?: unknown/);
  assert.match(currentCorpus, /kernel\?: "gaussian" \| "epanechnikov" \| "uniform" \| "triangular"/);
  assert.match(currentCorpus, /normalization\?: "unit" \| "count"/);
  assert.match(currentCorpus, /unit은 group density integral을 1로 맞추고 count는/);
  assert.match(currentCorpus, /FilterComparison =/);
  assert.match(currentCorpus, /oneOf.*predicate.*range.*정확히 하나/);
  assert.doesNotMatch(plannedCorpus, /filter predicate modes/);
  assert.match(currentCorpus, /type MarkSelector =/);
  assert.match(currentCorpus, /"eq" \| "neq" \| "gt" \| "gte" \| "lt" \| "lte"/);
  assert.match(currentCorpus, /op: "min" \| "max"/);
  assert.match(currentCorpus, /ties\?: "first" \| "all"/);
  assert.match(currentCorpus, /filterMarks\(\{ target\?, \.\.\.selector \}\)/);
  assert.match(currentCorpus, /selectMarks\(\{ id\?, target\?, \.\.\.selector \}\)/);
  assert.match(currentCorpus, /highlightMarks\(\{ id\?, target\?, select\?, selection\?/);
  assert.match(currentCorpus, /editBarMark\(\{/);
  assert.doesNotMatch(plannedCorpus, /^## `editBarMark`$/m);
  assert.doesNotMatch(plannedCorpus, /^## `selectRows`$/m);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /argmin.*Proposed|argmax.*Proposed/);
  assert.match(currentCorpus, /method\?: "linear"[\s\S]*method: "polynomial"[\s\S]*method: "loess"/);
  assert.match(currentCorpus, /interval\?: "mean" \| "prediction"/);
  assert.doesNotMatch(plannedCorpus, /regression method vocabulary|regression prediction interval/);
  assert.doesNotMatch(plannedCorpus, /ordered multi-transform pipeline/);
  assert.match(currentCorpus, /type AxisPositionX = "bottom" \| "top"/);
  assert.match(currentCorpus, /type AxisPositionY = "left" \| "right"/);
  assert.match(currentCorpus, /x bottom\/top default `0`/);
  assert.match(currentCorpus, /y right default\s+`Math\.PI \/ 2`/);
  assert.match(currentCorpus, /type AxisFormatString =/);
  assert.match(currentCorpus, /"\.0f" \| "\.1f" \| "\.2f"/);
  assert.doesNotMatch(plannedCorpus, /## mirrored Cartesian axis positions/);
  assert.doesNotMatch(plannedCorpus, /## axis label format strings/);
  assert.match(currentCorpus, /combined point-size legend는 right\/left side position을 사용/);
  assert.match(currentCorpus, /point-composite symbols in top\/bottom item grids/);
  assert.match(currentCorpus, /Composite layers share one item-local origin/);
  assert.match(currentCorpus, /type LegendPosition = "right" \| "bottom" \| "top" \| "left"/);
  assert.match(currentCorpus, /type TitlePosition = "top" \| "bottom" \| "left" \| "right"/);
  assert.match(currentCorpus, /maxWidth\?: PositiveFinite/);
  assert.match(currentCorpus, /wrap\?: TitleWrap/);
  assert.match(currentCorpus, /## `editTitle`/);
  assert.doesNotMatch(plannedCorpus, /## chart title positions|## title wrapping and measurement|## editTitle/);
  assert.match(currentCorpus, /parent\?: UserId/);
  assert.match(currentCorpus, /같은 parent의 direct sibling/);
  assert.doesNotMatch(plannedCorpus, /## graphic parent attachment/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /placement\?: "center" \| "boundary"/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /interactive\??:/i);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /coordinate-level `clip`\/transform options/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /custom (palette|scheme)|scheme registration/i);
});
