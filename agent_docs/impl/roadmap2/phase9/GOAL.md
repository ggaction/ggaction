# Roadmap 2 — Phase 9 Goal

## 목표

Current singular `filterMark`를 plural `filterMarks`로 교체하고, 모든 implemented mark의 final visual item을
semantic grain에서 선택하는 `selectMarks`와 naive-user facade `highlightMarks`를 구현한다. Point, histogram
bar와 line series의 approved primitive/public pairs를 중심으로 selector grammar, persistent selection,
mark-specific highlight, dimming, front order와 logical offset을 검증한다.

Relevant existing chart contracts:

- [`../chart/cars-scatterplot-variants.md`](../chart/cars-scatterplot-variants.md)
- [`../chart/cars-histogram-variants.md`](../chart/cars-histogram-variants.md)
- [`../chart/cars-line-chart-variants.md`](../chart/cars-line-chart-variants.md)

Planned normative action contract:

- [`../../../contract/planned/MARK_SELECTION.md`](../../../contract/planned/MARK_SELECTION.md)

## 진행 상태

- [x] Phase goal, public API hierarchy and selector algebra designed
- [x] Point/bar/path/rule selection grain and non-pixel boundary designed
- [x] `highlightMarks` facade, defaults and style applicability designed
- [x] STEP1–STEP12 and three visual approval Gates designed
- [ ] Contract and current implementation audit
- [ ] Pure selector and mark-item resolver foundation
- [ ] Point selection/highlight Gate A and public implementation
- [ ] Histogram longest-bar Gate B and public implementation
- [ ] Line-series Gate C and cross-mark integration
- [ ] `filterMarks` migration and `editBarMark`
- [ ] Robustness, docs, contract promotion and Phase closeout

## Public API scope

```text
filterMarks     retain matching items and rematerialize the target
selectMarks     persist one reusable selection over existing final mark items
highlightMarks  select or reuse a selection and apply mark-specific emphasis
editBarMark     edit whole-bar appearance and close the stable bar edit gap
```

`filterMark` is removed after migration. Internal selected-row derivation may be reused for row-grain points but
is not a direct public action. `selectMarks` is advanced authoring; `highlightMarks` is the concise ordinary API.

## Core behavior

- Shared selector operations: `eq | neq | gt | gte | lt | lte | oneOf | range | min | max`.
- `min | max` supports positive `count`, optional `groupBy`, and `ties: "first" | "all"`.
- Selection value comes from exactly one semantic field or channel. No selector reads concrete pixel length.
- Native item grain is point symbol, final bar rect, line/area series path or rule line.
- Selection definition and highlight appearance persist outside transient context and are reevaluated after
  rematerialization. Renderer continues to read only final `graphicSpec`.
- `highlightMarks` supports inferred defaults plus color/fill/stroke/opacity/width/dash/shape/size, complement
  dimming, selected-item front order and logical-pixel offset. It never accepts direct semantic x/y replacement.

## Visual Gates

### Gate A — selected Cars points

Select maximum-Horsepower row per Origin, emphasize selected points with accent color/diamond/size/offset, dim the
remaining points and place selected points last. This approves row grain, grouped rank, point recipe and logical offset.

### Gate B — longest histogram bar

Select the final bar with maximum y/count and emphasize its fill/stroke while retaining every other bar. This approves
post-bin semantic bar grain, `editBarMark`, front order and non-pixel channel ranking.

### Gate C — one line series

Select the Japan Origin path by field equality and emphasize stroke width/dash/color while dimming other series. This
approves series-path grain and shared selection behavior beyond point/bar marks.

Area and rule use focused mechanical tests because their selectable path/line recipes are already represented by Gate C.

## API coverage matrix

| Contract | Focused mechanical evidence | Visual evidence | Rematerialization evidence |
| --- | --- | --- | --- |
| Shared selector algebra | every operator, count/group/ties, numeric/string/missing/invalid | exercised across all Gates | semantic selection is unchanged by Canvas-only edits |
| `filterMarks` | point/bar/path grain, inference, atomic failure, singular-name removal | existing regression filter pairs remain exact | data/scale/mark/guide plan |
| `selectMarks` | IDs, target resolution, empty/multiple selections, exact item keys | Gates A–C | Canvas/scale/encoding/filter/cardinality reevaluation |
| `highlightMarks` | every style option and mark applicability/error | Gates A–C | selected/complement style, order and offset convergence |
| `editBarMark` | every property, conflict and every bar grain | Gate B | histogram/grouped/stacked/ranged plus Canvas/scale edits |

No parameter is marked covered from a screenshot alone. Statistical/rank results, resource/order effects, concrete
geometry/style and representative pixels remain separate evidence layers.

## 실행 순서

```text
STEP1   contract, API and migration audit
STEP2   shared selector grammar and independent fixtures
STEP3   mark-item resolver and persistent selection state
STEP4   point primitive
  ↓ Gate A
STEP5   selectMarks and point highlight public flow
STEP6   histogram longest-bar primitive
  ↓ Gate B
STEP7   bar resolver, editBarMark and bar highlight public flow
STEP8   line-series primitive
  ↓ Gate C
STEP9   line/area/rule integration and highlight dispatcher
STEP10  filterMark → filterMarks migration
STEP11  cross-cutting robustness and option matrix
STEP12  docs, contract promotion, closeout and remote verification
```

## 완료 조건

- Every planned selector value and every public function has focused executable evidence.
- Three approved primitive/public pairs match semantic state, graphic state, drawing order, Canvas calls and pixels.
- Point, all current bar grains, line/area series and rule items have deterministic semantic item identities.
- Selection/highlight survives Canvas, scale, encoding, grouping, filtering and cardinality rematerialization without
  stale IDs, styles or order.
- `filterMark` is absent from runtime, types, docs, contracts, examples and call-chain metadata.
- Public types, reference/API/tutorial docs, LLM bundle, catalog and architecture record match implementation.
- Phase 9 closeout contract proves all assigned actions/capabilities are Current or intentionally removed from Planned.
- Unit, contract, chart, docs, browser, PNG, coverage, package-boundary, remote CI and Pages checks pass.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
- [`STEP9.md`](STEP9.md)
- [`STEP10.md`](STEP10.md)
- [`STEP11.md`](STEP11.md)
- [`STEP12.md`](STEP12.md)
