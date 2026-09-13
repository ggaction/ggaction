# Roadmap 7 — 무추론 구현 명세

작성 기준: 2026-09-13. 기준 branch `codex/roadmap7-authoring-refinement`, 마지막 완료 제품 checkpoint `5832228c`.

이 문서는 구현자가 설계를 새로 해석하지 않고 남은 Roadmap 7을 실행하도록 만든 코드 수준 명세다. 공개 의미·기본값·수식은 각 `features/*.md`가 소유하고, 이 문서는 **수정 파일, 함수 경계, 상태 경로, 실행 순서, 삭제 규칙, 테스트 묶음과 종료 조건**을 소유한다. 두 문서가 다르면 feature 계약을 따르고 같은 checkpoint에서 이 문서를 고친다. 완료된 R02/R05/R06/R07/R08/R09/R10/R19/R20/R21/R22/R23/R27/R29/R31/R32/R33/R36은 다시 구현하지 않는다. R31/R32/R33의 facet/repeat cell만 R43에서 현재 action을 consumer로 검증한다.

## 1. 구현자가 지켜야 할 실행 형식

하나의 R번호에 대해 아래 순서를 그대로 실행한다.

1. 해당 feature, 현재 Phase `GOAL.md`/`STEP1.md`, `IMPLEMENTATION_MAP.json`, `ACCEPTANCE_CASES.json`을 읽는다.
2. 아래에 적힌 기존 control source와 test를 읽고 실제 현재 helper 이름을 확인한다. 경로가 이동했으면 `rg`로 역할 owner를 찾아 이 문서의 경로도 고친다.
3. public positive/negative type fixture와 capability contract의 실패 test를 먼저 추가한다.
4. closed-key normalizer와 pure resolver를 구현한다. 이 단계에서 `ChartProgram`, trace, ID allocator를 쓰지 않는다.
5. read-only plan을 만든다. target, owner, live references, affected consumers, cleanup 목록을 모두 구한 뒤에만 candidate를 만든다.
6. 최종 candidate 전체를 preflight한다. 중간 상태를 public action으로 순서대로 검증하지 않는다.
7. 기존 primitive/config helpers로 요청 state를 한 번 commit하고 canonical dependency order로 재물질화한다.
8. success, invalid input, downstream incompatibility 각각에서 이전 program과 deep-frozen caller input을 비교한다.
9. runtime, declarations, Current contract, ACTION_INDEX, knowledge, generated docs, installed package를 한 checkpoint로 맞춘다.
10. focused test와 영향 누적 test를 통과하고 commit/push한 뒤 feature/Phase status를 별도 기록 checkpoint로 닫는다.

모든 새 options object는 plain object여야 하고 prototype key, unknown key, sparse required field, numeric string, `NaN`, `Infinity`를 거부한다. omission은 유지, 명시된 `"auto"` 또는 remove action만 reset이다. arrays와 nested objects는 clone/freeze한다. expected 값은 production helper를 호출해 만들지 않는다.

### 공통 상태 비교 helper

각 capability contract에 로컬 test helper를 둔다. 이 helper는 production export가 아니다.

```js
function canonicalState(program) {
  return {
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    materializationConfigs: program.materializationConfigs,
    context: program.context,
    trace: program.trace,
    resolvedScales: program.resolvedScales,
    children: program.children,
    compositionSpec: program.compositionSpec
  };
}
```

오류 test는 호출 전 `structuredClone(canonicalState(program))`과 호출 후 상태를 `deepStrictEqual`한다. 성공 test는 원본 program이 그대로인지와 반환된 새 program만 바뀌었는지를 모두 검사한다.

### 공개 surface 종료표

각 기능은 적용 가능한 행을 모두 닫아야 한다.

| 행 | 반드시 확인할 위치 |
| --- | --- |
| runtime | family registrar와 `src/actions/index.js`; Full-only action은 Basic registrar에서 제외 |
| types | `types/program.d.ts`, `types/index.d.ts`, 필요한 `types/basic.d.ts`; positive와 `@ts-expect-error` |
| Current | `agent_docs/contract/current/*`, `ACTION_INDEX.json`; direct action은 owner 정확히 하나 |
| knowledge | `knowledge/action-intents.json`, `knowledge/intent-taxonomy.json`, relationship executable source |
| generated | catalog → relations → cards → docs 순서로 owner source에서 재생성 |
| package | `scripts/package-consumer.js`에서 packed tarball runtime, strict TS, MCP task 실행 |
| renderer | literal graphic + Canvas, 그리고 appearance면 SVG/PNG/PDF까지 |

## 2. Phase 7 — labels와 dynamic references

### R31 — `removeMarkLabels`

#### 공개 계약

```ts
type RemoveMarkLabelsOptions =
  | { target: string; source?: never }
  | { source: string; target?: never };
```

- `target`은 `layer.mark.type === "text"`이고 `layer.source`가 실제 source mark를 가리키는 attached label만 허용한다.
- `source`는 정확한 source mark ID다. 그 source의 attached labels가 0개면 성공 no-op다.
- both, neither, unknown key, empty ID, 독립 Text/Annotation target은 오류다.
- source mark, source dataset, source encodings/scales/guides, source를 target하는 selection/highlight는 보존한다.

#### 코드 owner와 추가 함수

1. 새 `src/actions/marks/text/removal.js`에 다음 private/pure 함수와 action을 둔다.
   - `isAttachedLabel(program, layer)`
   - `resolveAttachedLabelTargets(program, options)`
   - `collectAttachedLabelRemoval(program, labelIds)`
   - `preflightAttachedLabelRemoval(program, plan)`
   - public `removeMarkLabels`
2. `src/actions/marks/text/index.js`가 새 registrar를 Full에 등록한다. Basic에 새 method를 등록하지 않는다.
3. `src/actions/marks/remove.js`의 기존 selection/highlight cleanup과 label-layout cleanup을 이름 있는 internal helper로 추출할 때 기존 `removeMark` 결과와 trace를 바꾸지 않는다. R31만을 위해 public helper를 export하지 않는다.
4. `src/materialization/dependencies.js`와 facet retained recipe owner에서 attached label replay entry를 찾는 helper를 제공한다. 현재 저장 형식에 entry가 없으면 가짜 registry를 만들지 말고 현재 `layer.source`, `labelLayouts`, mark config를 canonical evidence로 사용한다.

#### 삭제 plan의 정확한 shape

```js
{
  sourceByLabel: Map<labelId, sourceId>,
  labelIds: [...],                 // ASCII ID 순서
  leaderIds: [...],                // labelLayouts[labelId].leaderId
  selectionIds: [...],             // selection.config.target이 labelId
  highlightIds: [...],             // target이 labelId 또는 위 selection 사용
  labelOwnedResourceIds: [...],    // 실제 ownership metadata가 있는 경우만
  replayPaths: [...]                // retained recipe 안의 attachment path
}
```

`source` 호출은 해당 source의 모든 label을 먼저 모은 뒤 하나의 plan으로 preflight한다. 한 label에 외부 live reference가 있으면 아무것도 지우지 않는다. `labelOwnedResourceIds`는 이름 접두사로 추측하지 않고 실제 owner metadata만 사용한다.

#### transaction 순서

1. options를 검증하고 target/source를 resolve한다.
2. plan을 만들고 closure 밖 live reference를 검사한다.
3. retained recipe에서 label attachment를 제거한 immutable snapshot 후보를 만든다.
4. `highlightIds` config, `selectionIds` config, label layout config, label mark config 순으로 제거한다.
5. leader graphic, label graphic, label semantic layer 순으로 제거한다.
6. 독점 소유이며 이제 참조 0인 helper resource만 제거한다.
7. `context.currentMark`가 label이면 해당 label의 source로 바꾼다. 삭제 selection을 가리키는 `currentSelection`은 unset한다. 다른 pointer는 유지한다.
8. source mark는 재물질화하지 않아도 graphic fingerprint가 동일해야 한다. replay cleanup 검증을 위해 후속 source edit/Canvas/theme를 실행한다.

#### 테스트 파일과 필수 assertions

- 새 `test/contracts/remove-labels.test.js`가 R31-N01/N02/N03/E01/L01/L02를 소유한다.
- `test/unit/actions/marks/remove-mark.test.js`, `mark-labels.test.js`, `label-layout.test.js`를 회귀한다.
- target L1 제거 뒤 B/L2의 semantic, graphic item IDs, data/scale IDs가 동일해야 한다.
- source B 제거 호출은 L1/L2/leader만 제거하고 B를 유지한다.
- 같은 source 재호출은 label 0, source fingerprint 동일인 정상 결과다.
- 외부 참조 하나가 있는 multi-label source는 부분 삭제가 없어야 한다.
- remove → `encodeY` 또는 적용 가능한 source edit → `editCanvas` → `applyTheme` → facet replay 뒤 labels/leaders/config가 0이어야 한다.

### R32 — final-item label membership

#### 공개 계약과 requested state

`createMarkLabels`는 기존 options와 아래 exclusive union을 결합한다. 두 키 생략은 all이다.

```ts
type LabelSelection =
  | { select?: never; selection?: never }
  | { select: MarkSelector; selection?: never }
  | { selection: string; select?: never };

type EditMarkLabelSelectionOptions = { target: string } & (
  | { select: MarkSelector; selection?: never; all?: never }
  | { selection: string; select?: never; all?: never }
  | { all: true; select?: never; selection?: never }
);
```

정규화된 owner는 `materializationConfigs.marks[labelId].labelAuthoring.selection`이다.

```js
{ kind: "all" }
{ kind: "inline", selector: normalizedMarkSelector }
{ kind: "named", id: selectionId }
```

resolved item index/key를 이 객체에 저장하지 않는다. edit는 객체 전체 교체다.

#### 코드 owner와 알고리즘

1. 새 `src/grammar/markLabelSelection.js`에 `normalizeLabelSelectionCreate`, `normalizeLabelSelectionEdit`를 둔다. 기존 `normalizeMarkSelector`를 호출하고 다시 구현하지 않는다.
2. `src/actions/marks/text/actions.js`의 `LABEL_OPTIONS`에 `select`, `selection`을 추가한다. label 생성 전 source와 named selection target 일치를 검증한 뒤 `labelAuthoring.selection`을 저장한다.
3. 같은 파일 또는 새 `src/actions/marks/text/authoring.js`에 Full-only `editMarkLabelSelection`을 둔다. target은 attached label이어야 한다.
4. `src/materialization/text.js`의 source-owned branch에서 `resolveMarkItems(program, source.id)` 결과를 먼저 얻는다. 그 배열에 inline selector 또는 named selection의 stored selector를 적용한다. 선택 key를 source final-item 순서로 filter하고 rank 순서로 재정렬하지 않는다.
5. 선택된 items만 기존 `resolveMarkLabelValues`와 anchor/layout에 넘긴다. no-match는 정상 empty text collection이다.
6. `src/actions/selection/actions.js`에서 `editMarkSelection`은 dependent labels를 찾고 source geometry를 바꾸지 않은 채 label → layout → highlight 순서로 refresh한다. `removeMarkSelection`은 named label ref가 하나라도 있으면 referrer label IDs를 정렬해 오류를 낸다.
7. R31 삭제는 named selection edge만 해제하며 selection 자체는 보존한다.

#### grain과 invalid 조합

- predicate input은 highlight 적용 전 final items다.
- `filterMarks` 이후 items를 사용한다. 일반 data transform/aggregate는 이미 materialized source grain을 사용한다.
- Line/Area는 기존 selection policy의 series grain을 유지한다. 집계 item에 존재하지 않는 raw field는 오류다.
- named selection의 `definition.target`은 label `layer.source`와 같아야 한다.
- label 자신이나 그 label에서 파생된 selection을 참조하는 cycle은 state write 전에 거부한다.
- `all:false`, select+selection, named source mismatch, unknown selection은 오류다.

#### 테스트

- 새 `test/contracts/selected-labels.test.js`; 기존 `selection-policy.test.js`, `selection-lifecycle-render.test.js`, `mark-labels.test.js` 회귀.
- `[1,5,3]`, max count2는 source indices `[1,2]`, label texts `[5,3]`, body 3개다.
- `[5,5,3]`, ties first/all 결과를 각각 `[0]`, `[0,1]`로 literal assert한다.
- gt10은 label 0이고 source domain/graphic은 동일하다.
- named gt4→gt2는 1→2 labels, selection 삭제는 먼저 실패한다.
- source reorder `[3,1,5]` 뒤 predicate를 다시 평가하고 cached indices를 재사용하지 않는다.

### R33 — semantic label placement

#### 공개 계약과 저장

```ts
type MarkLabelPlacement = {
  anchor: "center" | "insideStart" | "insideEnd" |
          "outsideStart" | "outsideEnd";
  gap?: number;
  overflow?: "hide" | "outside" | "allow";
  leader?: false | { stroke?: string; strokeWidth?: number };
};
```

`createMarkLabels.placement` 생략은 기존 anchor parity다. object 기본은 `gap:4`, `overflow:"hide"`, `leader:false`. `editMarkLabelPlacement({target,placement:"auto"})`는 `labelAuthoring.placement`만 제거하고 selection/content/layout/style은 보존한다. object는 전체 교체다.

#### 지원표를 코드 상수로 고정

새 `src/grammar/markLabelPlacement.js`의 `LABEL_PLACEMENT_SUPPORT`를 validator와 tests가 함께 읽는다. public export는 하지 않는다.

| source family | 허용 anchor |
| --- | --- |
| Bar, 방향이 유일한 interval Rect | 다섯 개 전부 |
| 방향 없는 Rect, Cartesian Point | center |
| Arc/Pie/Rose | 다섯 개 전부 |
| Polar Point, 지원 Radar vertex | center, outsideEnd |
| Line/Area/Parallel series | 새 placement object 전체 오류; 기존 endpoint API 유지 |
| Text/annotation/기타 | 오류 |

#### pure geometry 함수

`src/layout/labels.js`에 다음 함수를 추가하되 program state를 읽지 않는다.

```js
normalizeMarkLabelPlacement(value)
resolveSemanticLabelAnchor({family, itemGeometry, placement, textMetrics})
fitsLabelGeometry({family, itemGeometry, rotatedBounds})
resolveSemanticLabelLeader({sourceBoundary, finalBounds})
```

`src/materialization/text.js`가 source final item, orientation, projected endpoints, R29 resolved Polar frame을 pure 입력으로 변환한다. 계산 순서는 text metrics → boundary/outward vector → bbox support distance → gap → dx/dy → fit/overflow → collision layout → leader다.

arbitrary ray의 support distance는 `(abs(ux)*width + abs(uy)*height)/2`이며 rotation이 있으면 rotated bbox를 쓴다. outside text center는 `P + (gap + support)*u`, inside는 `P - (gap + support)*u`다. Bar start/end 방향은 final projected baseline→value vector로 결정해 negative/reverse를 별도 부호 분기로 처리하지 않는다. Arc는 wrap-aware angle midpoint와 inner/outer boundary를 사용한다.

#### fit과 leader 규칙

- Bar/Rect는 full bbox containment를 검사한다.
- Arc는 네 corner뿐 아니라 bbox edge가 sector edge/inner hole을 가로지르는지도 검사한다.
- hide는 item을 graphic에서 제외하고, outside는 같은 boundary 바깥으로 한 번만 fallback하고, allow는 후보를 유지한다.
- zero-length Bar는 center를 허용하고 inside/outside 방향은 quantitative scale의 final 증가 방향을 쓴다.
- placement leader와 기존 collision-layout leader를 동시에 요청하면 중복 선을 만들지 않고 preflight 오류다.
- leader는 visible, nonempty, displaced label만 생성하며 source boundary에서 final bbox 최단점까지다.

#### 코드 연결과 테스트

1. `src/actions/marks/text/actions.js`에 placement create option과 requested state write를 추가한다.
2. `src/actions/marks/text/authoring.js`에 Full-only `editMarkLabelPlacement`을 등록한다.
3. source mark/scale/Canvas/coordinate/R32 membership edit가 text → fit → collision → leader를 재실행하도록 dependency planner를 보강한다.
4. R31 closure가 semantic-placement leader와 config를 모두 제거한다.
5. 새 `test/contracts/semantic-label-anchors.test.js`가 R33-N01/N02/N03/E01/L01/L02를 소유한다.
6. positive +5 end `(50,20)`, bbox `20×10`, gap4는 bbox bottom16; negative end `(50,100)`은 bbox top104다.
7. donut inner40/outer80/theta0..90 outsideEnd boundary는 angle45/r84이며 text center에는 support distance가 더해져야 한다.
8. font edit, y reverse, Canvas resize, R27 aspect, R29 frame 후 vector/fit/leader를 다시 계산한다.

### R36 — dynamic statistical reference line/band

#### public discriminated union

기존 literal `x`/`y` signature는 그대로 둔다. dynamic branch는 literal keys와 섞지 않는다.

```ts
type ReferenceStatistic =
  | { op: "mean" | "median" | "min" | "max"; p?: never }
  | { op: "quantile"; p: number };

type DynamicReference = {
  source: string;
  axis: "x" | "y";
  population?: "boundData" | "visibleItems";
  field?: string;
  x?: never; y?: never; space?: never; data?: never;
  coordinate?: never; temporalUnit?: never;
};
```

line은 `statistic` 하나, band는 정확히 2개의 `statistics`를 받는다. line의 `statistics`, band의 `statistic`, dynamic+literal 혼합은 오류다. population 기본은 `boundData`다.

#### state와 pure core

requested owner는 `materializationConfigs.marks[referenceId].statisticalReference`다.

```js
{
  source: sourceMarkId,
  axis: "x" | "y",
  population: "boundData" | "visibleItems",
  field: { kind: "axis" } | { kind: "explicit", field: string },
  statistics: [normalizedStatistic],
  dataId: generatedDataId
}
```

line도 내부에서는 length-1 statistics 배열을 쓴다. 생성 data ID는 `${referenceId}-statistical-reference-data`로 고정하고 일반 user resource와 충돌하면 생성 전에 오류다. resolved datum을 requested config에 저장하지 않는다.

새 `src/grammar/statisticalReference.js`에 union validator, field/population resolver, finite population adapter를 둔다. 기존 summary quantile helper를 호출할 때 `{op:"quantile", probability:p}`로 명시 변환한다.

#### 정확한 실행 순서

1. source가 non-reference Cartesian mark이고 요청 axis에 quantitative scaled encoding을 갖는지 검사한다.
2. omitted field는 `{kind:"axis"}`로 저장하고 매 replay마다 source의 current axis role을 찾는다. explicit field는 그대로 유지한다.
3. boundData는 `markFilter` wrapper만 transparent하게 역추적한다. 일반 `filterData`, computed, complete, normalize, summary는 넘어가지 않는다.
4. visibleItems는 최종 filter 후 item에서 scalar를 읽는다. Line/Area/Parallel series처럼 하나의 scalar가 정의되지 않으면 오류다.
5. source scale domain과 range를 먼저 resolve한다. dynamic reference는 domain contributor 목록에서 제외한다.
6. population의 missing/nonfinite를 조용히 제거하지 않는다. field가 없거나 finite population이 0이면 오류다.
7. statistic을 계산한다. band 결과가 `lower > upper`면 오류, 같으면 허용한다.
8. generated one-row dataset을 만들고 기존 Rule/Rect materializer를 사용한다. 새 renderer branch를 만들지 않는다.
9. source edit/filter/reencode/scale/Canvas/facet replay에서 통계 → datum → Rule/Rect 순으로 다시 만든다.

selection/highlight는 population을 바꾸지 않는다. source removal은 existing owned-dependent policy로 reference까지 제거한다. R25 collector는 source mark, source data, source axis scale edge를 live로 본다.

#### 테스트

- 새 `test/contracts/statistical-references.test.js`, 기존 `reference-marks.test.js`, `references.test.js`, derived-editing 회귀.
- `[2,4,6]` mean 4.
- `filterMarks gt3`: boundData 4, visibleItems 5. selection gt3만 적용하면 둘 다 4.
- `[0,10,20,30]` quantile .25/.75는 `[7.5,22.5]`.
- source inferred field reencode는 새 role 추적, explicit field는 유지 검증.
- empty, p1.1, reversed band, reference-as-source, series visibleItems는 원자적 오류다.
- dynamic reference가 auto domain을 바꾸지 않음을 resolved scale literal로 확인한다.

### Phase 7 closeout fixture

한 contract fixture에서 다음 순서를 실행한다.

```text
source data edit
→ source mark/filter materialization
→ named/inline selection evaluation
→ selected label membership
→ semantic label placement/fit
→ dynamic reference population/statistic
→ scale mapping
→ collision/layout/leader
→ highlight replay
```

labels와 references가 source scale domain contributor가 되지 않고, selection/highlight가 boundData/visibleItems 통계를 바꾸지 않아야 한다. R31 삭제 뒤 label recipe/leader가 replay에서 부활하지 않아야 한다.

## 3. Phase 8 — legend content, block identity, display names

### R37 — exact sampled legend values

#### 적용 범위와 state machine

`values`는 continuous size, opacity, strokeWidth legend에만 적용한다. categorical/interval/discrete size/color gradient/stroke gradient에는 적용하지 않는다. 기존 `count` 자동 표본 알고리즘은 바꾸지 않는다.

내부 requested owner는 각 sampled legend config의 `sampling` 한 곳이다.

```js
{ mode: "auto", count: positiveInteger }
{ mode: "values", values: frozenNumbers, count: rememberedAutoCount }
```

| 현재 | public patch | 결과 |
| --- | --- | --- |
| auto | `values:[...]` | values mode, 이전 count 보존 |
| values | `values:[...]` | 배열 전체 교체 |
| values | `count:N`만 | 오류 |
| values | `values:"auto"` | auto, 저장 count 복구 |
| any | `values:"auto",count:N` | auto N |
| any | `values:[...],count:N` | 오류 |

create에서 `values:"auto"`는 오류이고 omission이 auto다. values는 length 1..100, finite, strictly increasing이다. 정렬하거나 dedupe하지 않는다. `-0`과 `0`은 같은 numeric identity다.

#### 코드 owner

1. 새 `src/actions/guides/legends/sampling.js`에 `normalizeLegendSampling`, `resolveLegendSampleValues`, `validateSamplingAgainstScale`을 둔다.
2. `src/actions/guides/legends/creation.js`와 `edit.js`가 create/edit union을 normalize한다. legacy `config.count`를 읽을 수는 있지만 첫 신규 write 뒤 `sampling`을 canonical owner로 쓰고 중복 root count를 제거한다.
3. `src/actions/guides/legends/size.js`, `strokeWidth.js`, `continuous/opacity.js`는 `sampling.mode`로 분기한다. values mode는 배열을 그대로 mapper에 넣고 labels도 같은 raw values를 formatter에 전달한다.
4. scale final-state preflight 경로가 bound sampled legend configs를 찾아 새 domain/type에서 다시 검증한다. 실패하면 scale/data/source edit 전체를 버린다.
5. R23 discrete size는 values/count를 명시적으로 거부한다. scale family migration 전에 기존 sampling compatibility를 검사한다.

#### domain과 mapping assertions

- effective domain의 numeric min/max 안에 모든 value가 있어야 한다. reverse는 판정이나 배열 순서를 바꾸지 않는다.
- log는 각 value가 양수여야 한다. clamp로 out-of-domain 값을 겹치게 만들지 않는다.
- size는 값→실제 area mapper, opacity는 값→opacity mapper, strokeWidth는 값→width mapper를 사용한다.
- mapped 0 symbol이 보이지 않아도 label과 item layout slot을 유지한다.

#### 테스트

- 새 `test/contracts/legend-values.test.js`; 기존 size/opacity/stroke-width legend unit/contracts 회귀.
- domain `[0,100]`, values `[10,50,100]`은 labels/symbols 정확히 3개고 mark domain은 동일하다.
- auto count5 → values3 → auto는 count5를 복구한다.
- descending, duplicate, empty, 101개, NaN, outside, count+values는 각각 오류다.
- domain `[0,100]`→`[0,40]` edit에서 stored 100 때문에 전체 edit가 실패하고 이전 program이 동일해야 한다.
- theme/move/Canvas/source replay 뒤 raw sample values와 mapped styles를 유지한다.

### R38 — `editLegendBlock`

#### public action과 block identity

새 action은 Full-only다. target은 기존 legend owner target, channel은 현재 logical block member다. editable field가 하나 이상 필요하다.

```ts
type EditLegendBlockOptions = {
  target: string;
  channel: LegendChannel;
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly DatasetScalar[];
  gap?: number;
  text?: { fontSize?: number; fontFamily?: string; fontWeight?: FontWeight; color?: string };
  symbol?: { size?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
  labelMap?: DisplayLabelMap | "auto";
};
```

`src/actions/guides/legends/target.js`에 private descriptor를 추가한다.

```js
{
  key: JSON.stringify([...channels].sort()),
  channels: frozenSortedChannels,
  kind,
  scaleIds,
  contentRecipe,
  styleRecipe
}
```

graphic ID/index는 identity가 아니다. merged color+shape에서 color와 shape는 같은 descriptor를 선택한다.

#### storage와 patch 규칙

canonical owner는 `materializationConfigs.guides.legendBlocks[target][descriptor.key]`다. 한 override object에 `content`와 `style`을 나누어 저장하고 resolved geometry나 graphic IDs를 저장하지 않는다.

- title은 모든 block에서 허용하고 `""`는 제목 숨김이다.
- values/count는 R37 sampled block만 허용하며 sampling owner로 전달한다.
- order는 categorical block에서 current raw domain의 exact typed permutation만 허용한다.
- gap은 finite nonnegative다.
- text/symbol object는 그 하위 object 전체 교체다. 생략 property는 root common style로 돌아간다.
- data mapping과 같은 visual property는 constant override로 덮을 수 없다: size block의 symbol.size, opacity의 opacity, strokeWidth의 strokeWidth, color의 fill, stroke의 stroke는 오류다.

#### 코드 owner와 transition

1. 새 `src/actions/guides/legends/blocks.js`에 resolver, validator, action, override applicator를 둔다.
2. `src/actions/guides/legends/index.js`에서 Full registrar에만 등록한다.
3. `src/actions/guides/legends/transition.js`가 old/new descriptors를 비교해 transition plan을 만든다.
4. key 동일/reorder/layout/theme는 override 유지다.
5. block 제거는 override도 제거한다. 재추가할 때 과거 override를 복구하지 않는다.
6. one old→many split은 compatible style만 복사할 수 있다. old title/order/values/labelMap이 하나라도 있으면 transition 전체 오류다.
7. many old→one merge는 모든 incoming override가 deep-equal이고 새 kind에서 유효한 경우만 합친다. last-wins는 없다.
8. `src/materialization/legends.js`는 base recipe → root common appearance → block override → geometry 순서로 만든다.
9. block text 크기 변화는 occupied legend bounds와 Canvas fitting을 다시 계산한다.

#### 테스트

- 새 `test/contracts/legend-blocks.test.js`, combined legend unit/contracts 회귀.
- color+size separate block에서 size title/values만 바뀌고 color graphic/config는 유지돼야 한다.
- merged color+shape를 color로 title A, shape로 title B 순서로 편집하면 같은 block title B다.
- incompatible overrides가 있는 두 block merge, absent channel, categorical values, data-mapping symbol override는 오류다.
- reorder 후 key/override 유지, remove+readd 후 default 복구를 검증한다.

### R39 — typed display labels와 facet header strips

#### shared `DisplayLabelMap`

새 `src/grammar/displayLabels.js`에 다음 API를 둔다.

```js
normalizeDisplayLabelMap(value, { allowAuto })
displayScalarKey(value)
resolveDisplayLabel(map, rawValue, fallback)
```

map은 `readonly {value:DatasetScalar,label:string}[]`이고 배열 전체 교체다. number 1과 string `"1"`을 구별하고 finite `-0`/`0`은 같은 key다. 같은 typed value 중복은 오류다. 같은 label을 여러 raw value에 쓰는 것은 허용한다. empty label과 empty map은 허용한다. unmatched value는 기존 formatter를 호출한다. map entry로 domain category를 새로 만들지 않는다.

#### guide 연결

1. Cartesian categorical axis label의 create/edit options와 Polar categorical theta label에 `labelMap`을 추가한다.
2. categorical legend create/edit와 R38 block에 같은 normalizer/lookup을 사용한다.
3. continuous axis, gradient tick, sampled numeric legend에 labelMap을 명시하면 오류다.
4. lookup은 raw typed value → labelMap → 기존 formatter 순서다. scale domain/order/selection keys/data rows는 바꾸지 않는다.
5. `"auto"`는 해당 requested map property만 제거한다.

#### facet header requested schema

기존 flat `materializationConfigs.facets[id].headers`는 legacy cell mode로 읽는다. 첫 explicit role/side 호출 후 다음 shape로 바꾼다.

```js
headers: {
  mode: "roles",
  common: { fontSize, fontFamily, fontWeight, color, offset, align?, labelMap? },
  roles: {
    row?: { side: "left" | "right", align?, labelMap?, ...stylePatch },
    column?: { side: "top" | "bottom", align?, labelMap?, ...stylePatch }
  }
}
```

role omission은 `all`이고 common만 patch한다. role-specific override precedence는 common → role이다. role map `"auto"`는 role property를 제거해 common으로 fallback하고, common map `"auto"`는 formatter default로 fallback한다. role all+side는 오류다. row side는 left/right, column은 top/bottom이다. one-field facet은 column role이며 row 요청은 오류다.

#### layout 순서

1. compositionSpec의 typed row/column role metadata에서 raw header identity를 읽는다. display 문자열을 split해 role을 추측하지 않는다.
2. final labelMap/formatter/style을 적용하고 common text metrics로 rotated bbox를 측정한다.
3. row/column별 최대 strip thickness에 offset과 기존 padding을 더한다.
4. outer Canvas/facet allocation에서 strip을 먼저 차감한다.
5. child plot bounds를 배치하고 그 뒤 R27 aspect, R29 frame, guides/legends를 계산한다.
6. 공간이 부족하면 기존 layout error를 사용하고 Canvas를 자동 확대하지 않는다.

`src/actions/facets/actions.js`의 `editFacetHeaders`, `src/materialization/facets.js`, `src/actions/facets/guides.js`, `src/layout/facets.js`가 위 schema/accessor를 공유한다.

#### 테스트

- 새 `test/contracts/display-names-headers.test.js`, axis labels/facet layout/legend 회귀.
- raw `[1,"1","KR","XX"]`는 map에 따라 `["하나","1","한국","XX"]`이고 raw domain은 동일하다.
- A/B 모두 `"같음"`으로 표시해도 domain cardinality는 2다.
- row raw A와 column raw A가 서로 다른 map을 사용하고 replay 후 유지해야 한다.
- long right/bottom header와 font 증가 뒤 child plot bounds가 줄고 overlap이 없어야 한다.
- duplicate typed key, continuous axis map, all+side, one-field row는 원자적 오류다.

### Phase 8 closeout fixture

R22 stroke와 R23 size가 있는 한 combined legend에서 size exact values, color/stroke display map, block title/style을 함께 적용한다. channels reorder/merge/split, theme, Canvas, facet source replay 뒤 descriptor key와 requested owner가 유지돼야 한다. 제거한 block은 재추가 때 stale override가 없어야 한다.

## 4. Phase 9 — custom theme와 shape style

### R47 — custom theme definition과 descendants propagation

#### exact public input

```ts
type ThemeDefinition = ThemeName | {
  base: ThemeName;
  tokens: Partial<ThemeTokens>;
};
type ApplyThemeOptions = {
  theme: ThemeDefinition;
  scope?: "self" | "descendants";
};
```

`theme` string 기존 호출은 그대로다. object의 root keys는 base/tokens 정확히 둘이며 둘 다 필수다. tokens `{}`는 base-only와 같은 output이다. `scope` 생략은 unit self, composition descendants다. unit에서 self/descendants는 같은 unit 결과다.

허용 token은 `src/theme/defaults.js`의 다음 18개로 닫는다.

```text
background, mark, text, strongText, mutedText, axis, axisTitle, grid,
border, sizeSymbol, regressionBand, boxLine, boxMedian, referenceLine,
referenceBand, gradientCenter, highlight, fontFamily
```

앞 17개는 기존 renderer-neutral color validator, fontFamily는 nonempty string validator를 사용한다.

#### requested state

unit theme owner는 기존 `materializationConfigs.theme`를 확장한다.

```js
{
  name: baseThemeName,
  tokens: frozenPartialTokens,       // resolved full token set 저장 금지
  overrides: existingExplicitRegistry,
  scope: "self" | "descendants",
  origin?: { ownerCompositionId: string, kind: "inherited" }
}
```

새 apply는 previous custom tokens와 merge하지 않는다. base 위에 이번 tokens만 overlay한다. `overrides`는 보존한다. 값이 theme default와 같아도 explicit provenance를 값 비교로 지우지 않는다.

composition owner는 현재 root theme config와 retained facet/repeat source에 descendant policy를 저장한다. 외부에서 concat/facet에 전달됐던 원래 child program은 수정하지 않는다.

#### code owner와 실행 순서

1. `src/theme/defaults.js`에서 `THEME_TOKEN_KEYS`, `normalizeThemeDefinition`, `resolveThemeTokens`를 export한다.
2. `src/actions/theme/actions.js`의 closed keys를 theme/scope로 확장하고 최종 requested config를 만든다.
3. `src/actions/theme/reconcile.js`는 `resolvedTokens`를 명시 입력으로 받고 explicit provenance를 우선한다. palette/data-driven color는 mark token으로 덮지 않는다.
4. 새 `src/actions/theme/composition.js` 또는 현재 composition helper에 immutable postorder walker를 둔다. root → retained sources/children에 requested policy를 기록하고, leaf unit reconcile 후 parent layout을 안쪽에서 바깥쪽으로 다시 계산한다.
5. fontFamily 변경은 text → label fit/collision → axis/legend/header metrics → child layout → parent Canvas fitting 순서로 refresh한다.
6. child에 직접 applyTheme하면 inherited origin 대신 explicit local owner가 된다. 이후 parent descendants apply는 새 명시 호출이므로 child requested definition을 새 inherited 요청으로 교체하되 child의 explicit mark/guide style은 보존한다.
7. `removeTheme`은 self에서는 current theme tokens를 base light로 돌리고 explicit styles를 유지한다. descendants policy가 있으면 그 origin을 가진 child inherited theme만 제거한다. 다른 origin 또는 independent explicit child theme을 지우지 않는다.

#### precedence oracle

```text
explicit mark/guide style
> unit custom token
> inherited custom token
> built-in base token
```

custom A `{mark:red,grid:green}` 뒤 custom B `{mark:blue}`면 grid는 base default로 돌아간다. categorical palette, encoded color/stroke, R38 block override, R49 explicit style은 유지된다.

#### tests

- 새 `test/contracts/custom-theme.test.js`, 기존 `theme.test.js`, all-unit-theme contracts, facet/concat 회귀.
- light+mark red/grid green/font custom에서 default-only nodes만 바뀌고 explicit blue는 blue다.
- nested concat+facet+repeat descendants는 generated children과 replay source 모두 같은 current policy를 쓴다.
- composition self는 root background만 바꾸고 child graphics/configs를 그대로 둔다.
- original input programs는 before/after deep-equal이다.
- unknown token, invalid color, empty font, missing base, extra root key는 원자적 오류다.
- existing light/dark pixel parity를 보존하고 large font에서 occupied layout을 다시 계산한다.

### R49 — rounded corners와 concrete stroke cap/join

#### family × property matrix

| family | `cornerRadius` | `lineCap/lineJoin/miterLimit` |
| --- | --- | --- |
| Bar, Rect | 지원 | stroked outline에 지원 |
| Line, Area, Rule, Tick, Arc | 오류 | 지원 |
| Point | 오류 | 지원; circle에서는 저장되지만 시각 효과 없음 |
| Text | 오류 | 오류 |

기본은 cornerRadius0, lineCap butt, lineJoin miter, miterLimit10이다. create/edit omission은 기존 requested state를 유지한다. explicit cornerRadius0은 rounding을 해제한다. cornerRadius는 finite nonnegative, miterLimit은 finite positive, enum은 닫힌 집합이다.

#### source files

1. 새 `src/grammar/strokeStyle.js`: common enum/default/number validator와 family compatibility.
2. 새 `src/grammar/roundedRect.js`: normalized rect와 concrete `M/L/C/Z` commands.
3. Bar: `src/actions/marks/bar/create.js`, `edit.js`, `materialize.js`.
4. Rect: `src/actions/marks/rect/actions.js`.
5. Line/Area: 각 `actions.js`, `materialize.js`.
6. Rule/Tick/Arc/Point: 각 family create/edit/materialize owner.
7. concrete schema validator, painted-bounds owner, `src/renderers/canvas/*`, `src/renderers/svg.js`, `src/renderers/pdf.js`.
8. applicable chart facades가 nested mark style을 전달하는 options라면 같은 fields를 whitelist/type에 추가한다. facade에서 새 의미를 재정의하지 않는다.

#### rounded rect algorithm

requested radius는 mark config에 보존한다. materialization 때 `x=min(x1,x2)`, `y=min(y1,y2)`, `w=abs(x2-x1)`, `h=abs(y2-y1)`, `r=min(requested,w/2,h/2)`를 계산한다. r0은 기존 Rect graphic parity를 유지한다. r>0은 같은 graphic ID/parent 자리에 backend-neutral path를 만든다.

quarter-circle cubic coefficient는 `k = 4 * (sqrt(2) - 1) / 3`이다. 시작점 `(x+r,y)`, clockwise로 top/right/bottom/left straight segment와 네 cubic, 마지막 Z를 만든다. 각 tangent control offset은 `k*r`다. backend native `roundRect`와 혼용하지 않는다. negative/reversed Bar도 위 normalized bounds를 사용하며 stacked Bar 각 segment 네 corner를 동일하게 round한다.

#### stroke attrs와 painted bounds

- concrete node는 `lineCap`, `lineJoin`, `miterLimit`을 명시한다. renderer draw마다 defaults 또는 node value를 설정해 이전 node state가 다음 node에 새지 않게 한다.
- SVG는 `stroke-linecap`, `stroke-linejoin`, `stroke-miterlimit`; Canvas/PDF는 같은 enum/number 의미를 쓴다.
- butt endpoint tangent 확장0, round/square는 `strokeWidth/2` 확장이다. closed path는 cap 영향을 받지 않는다.
- miter length는 `halfWidth / sin(turnInteriorAngle/2)`, ratio는 `miterLength/halfWidth`; miterLimit 초과는 bevel fallback이다.
- zero-length segment에서 divide-by-zero를 만들지 않고 existing drawable policy를 따른다.
- hit/selection/layout/clip bounds는 paint extension을 포함한다.

#### legend, highlight, lifecycle

legend symbol과 highlight clone은 source requested style/concrete attrs를 같은 helper로 받아야 한다. theme는 explicit style을 덮지 않는다. reencode/source/Canvas/facet replay 뒤 style owner를 다시 읽는다. Line endpoint arrow의 크기 계산에 cap을 전파하지 않는다.

#### tests

- 새 `test/contracts/shape-style-details.test.js`와 pure grammar/renderer unit tests.
- rect100×20/r50은 resolved r10; r0은 기존 graphic/pixels와 동등하다.
- line `(0,0)→(10,0)`, width4는 butt x `[0,10]`, round/square x `[-2,12]`, y `[-2,2]`다.
- negative Bar와 stacked segments 각각 clamp를 검증한다.
- Point cornerRadius, negative radius, cap flat, miterLimit0, unsupported family/property는 오류다.
- round node 다음 omitted-cap node가 butt인지 검사해 Canvas/PDF state leak를 잡는다.
- mark→legend→highlight, Canvas/SVG/PNG/PDF, resize/theme/reencode/facet persistence를 검증한다.

### Phase 9 closeout fixture

custom theme의 mark/text tokens, R38 block override, R49 explicit round/cap/join을 같은 chart에 적용한다. explicit property가 theme보다 우선하고, custom A→B transition에서 A-only token만 base로 돌아가며 explicit shape style은 유지돼야 한다. 세 vector/raster backend가 같은 concrete commands와 attrs를 소비해야 한다.

## 5. Phase 10 — R43 non-Cartesian facet/repeat

R43은 한 family가 성공하면 끝나는 기능이 아니다. 아래 7개 family 각각에 facet, facetGrid, source replay, local coordinate, supported guide, renderer evidence가 있어야 한다.

```text
Polar Point, Polar Line, Arc, Pie, Rose, Radar, ParallelCoordinates
```

### public option normalization

1. `FacetScaleResolutions`에 `theta`, `r`, `stroke`, `parallelDimensions`를 추가한다. 값은 shared/independent다. 새 기본은 shared다.
2. public alias는 `r` 하나다. `radius`를 동시에 또는 별도 public key로 받지 않는다. 내부에서는 semantic radius channel로 한 번 정규화한다.
3. `repeatCharts.channel`은 기존 x/y에 `theta`, `r`, `{parallelDimension:string}`을 추가한다.
4. repeat fields는 nonempty unique field names다. 2D repeat, facet values edit, cell override를 추가하지 않는다.
5. existing target inference가 정확히 하나의 eligible layer를 결정할 때만 생략을 허용한다. 새 family 때문에 first-match 추론을 만들지 않는다.

### 파일별 작업

1. `src/grammar/facets/dependencies.js`
   - layer encoding의 theta/r/stroke scale을 수집한다.
   - Parallel `dimensions[].scale`, coordinate, attached labels/selection, dynamic references, legend blocks/sampling/map, theme/style requested refs를 typed descriptor로 수집한다.
   - replay DAG를 row-preserving transform과 statistical transform 단계로 구분한다.
2. `src/actions/facets/derive.js`
   - current `deriveCellProgram`의 early empty-mark deletion을 family-aware empty materialization으로 바꾼다.
   - raw source partition → row-preserving replay → statistical replay → layer rebind 순서를 지킨다.
   - graphic crop/clone을 쓰지 않는다.
3. `src/grammar/facets/scales.js`
   - theta/r/stroke/parallel dimension domain resolver를 추가한다.
   - shared semantic domain과 child-local pixel range를 다른 object/path로 보존한다.
4. `src/actions/facets/actions.js`
   - family eligibility와 repeat role substitution을 closed switch로 구현한다.
   - 모든 requested field/type/role compatibility를 child ID 생성 전에 검사한다.
5. `src/actions/facets/replay.js`
   - retained source와 child provenance mapping을 사용해 source edit/Canvas/theme 후 같은 6단계 pipeline을 재실행한다.
6. `src/actions/facets/guides.js`, `src/materialization/facetGuides/*`, `src/materialization/facets.js`
   - non-Cartesian axes/grids는 per-panel internal만 허용한다.
   - compatible shared categorical/size/stroke legend와 R37/R38/R39 content를 parent에 조합한다.
7. `src/grammar/parallelCoordinates.js`
   - dimension list/order/type/scale compatibility와 dimension별 domain을 독립적으로 해결한다.

### 정확한 child pipeline

각 public facet/facetGrid/repeat 호출은 모든 child를 private candidate로 만든 뒤 한 번에 commit한다.

1. retained source에서 source-grain data와 provenance DAG를 resolve한다.
2. partition key를 typed identity로 group하고 requested values/combinations order를 보존한다.
3. 각 partition에서 row-preserving transforms를 실행한 다음 statistical transforms를 topology 순서로 실행한다.
4. 모든 child local outputs를 확보한 뒤 shared/independent domains를 계산한다.
5. child local Canvas/plot allocation을 만들고 R27 aspect, R29 Polar frame, position range를 순서대로 resolve한다.
6. mark/series/path → R32 selection membership → R33 labels → local guides → shared-compatible legend → R39 header strips → R47 theme/R49 style → parent placement 순서로 materialize한다.
7. semantic/config/graphic IDs를 namespace map으로 다시 연결하고 parent occupied layout을 계산한다.

어느 child에서든 실패하면 parent semantic, children, compositionSpec, trace, ID sequence를 모두 버린다.

### family domain rules

- Polar quantitative shared domain은 child local effective values의 union이다. categorical theta shared domain은 requested order 또는 child 순서의 first-appearance typed union이다.
- independent domain은 child별이다. explicit domain은 먼저 적용하고, independent auto + value 0개는 오류다.
- Pie는 partition마다 local measure 합을 requested angular span에 정규화한다. 전체 facet rows 합을 분모로 쓰지 않는다.
- Rose는 theta category domain과 r aggregate domain을 독립 계산한다.
- Radar는 dimension order와 closed path를 보존하고 missing dimension을 임의 0으로 채우지 않는다.
- Parallel shared domain은 dimension field별 union이다. 서로 다른 dimension 수치를 한 extent에 합치지 않는다.
- shared scale은 domain 의미만 공유한다. radius range와 R29 center/R, Parallel x dimension positions는 child bounds에서 계산한다.

### repeat substitution rules

- theta/r repeat는 직접 field-bound role을 가진 Polar Point/Line/Arc/Rose만 허용한다. Pie/Radar에는 오류다.
- `{parallelDimension:"a"}` + fields `["c","d"]`는 `[a,b,…]`를 child별 `[c,b,…]`, `[d,b,…]`로 바꾼다.
- 교체 dimension의 scale/guide/label binding만 옮기고 sibling dimension은 동일하게 유지한다.
- replacement가 sibling field와 중복되거나 field type/scale type이 incompatible하면 모든 child 생성 전에 오류다.
- computed AST나 다른 문자열에서 field 이름을 전역 치환하지 않는다.

### guides와 empty cells

- non-Cartesian `guides.axes` omission은 each다. explicit outer는 오류이며 local로 downgrade하지 않는다.
- shared legend는 모든 child의 channel kind, semantic scale type/domain, R37 samples, R38 override, R39 labels가 compatible해야 한다.
- empty cell은 child ID/header/panel을 유지하고 mark item 0이다. explicit/shared domain이 있으면 guide를 그 domain으로 만들 수 있다.
- 모든 cells가 empty이거나 independent auto domain을 계산할 값이 없는 cell은 기존 empty-domain error를 낸다. `[0,1]`을 만들지 않는다.

### required matrix and tests

새 `test/contracts/polar-parallel-facets.test.js`와 기존 `facet-derived-families.test.js`, `facet-grid-repeat.test.js`, `parallel-coordinates.test.js`, Polar contracts를 실행한다.

| family | facet | facetGrid | repeat | 필수 추가 assertion |
| --- | --- | --- | --- | --- |
| Polar Point | required | required | theta/r | shared theta union, local R29 frame |
| Polar Line | required | required | theta/r | series/path order, local selected labels |
| Arc | required | required | theta/r if direct-bound | angle/r bounds, empty panel |
| Pie | required | required | rejected | per-panel 360° local shares |
| Rose | required | required | theta/r | category/r aggregate 분리 |
| Radar | required | required | rejected | dimension order, closed path |
| Parallel | required | required | parallelDimension | field별 domains, dimension order |

고정 oracle는 Polar A r `[1,2]`, B `[10,20]` shared `[1,20]`/independent `[1,2]`,`[10,20]`; theta A `[a,b]`, B `[b,c]` shared `[a,b,c]`; Pie `[1,1]`과 `[1,3]`은 180/180°, 90/270°; Parallel a `[0,1]`, b `[0,1000]`은 서로 다른 domains다.

R43-L02는 표의 각 required cell에 runtime, types, Canvas/SVG/PNG/PDF, installed package 증거를 기록해야 passed다.

## 6. Phase 11 — R25 safe named resource removal

### public actions

Full-only `removeData({id})`, `removeScale({id})`, `removeCoordinate({id})`를 추가한다. options는 id 정확히 하나이며 target inference/cascade/batch는 없다. unknown ID, wrong kind, chart-owned internal resource는 오류다.

### typed reference registry

새 `src/core/resourceReferences.js`에 다음 internal API를 둔다.

```ts
type ResourceReference = {
  kind: "data" | "scale" | "coordinate" | "mark" | "selection";
  id: string;
  ownerKind: string;
  ownerId: string;
  path: readonly (string | number)[];
  strength: "live" | "context";
};
collectResourceReferences(program, {kind,id}): readonly ResourceReference[];
```

collector는 known schema만 읽는다. JSON/string 전체 검색, 이름 prefix, trace args, resolved numeric 값으로 reference를 추측하지 않는다. 정렬 키는 ownerKind → ownerId → canonical path string이다. 반환 배열과 path는 freeze한다.

### owner collectors

각 owner module에 private collector를 두고 root registry가 조합한다.

| resource | 반드시 등록할 live path |
| --- | --- |
| data | layer.data, dataset.source, standalone owner.current, chart-private owner, retained facet/repeat source, dynamic statistical population |
| scale | x/y/x2/y2/theta/r/color/stroke/size/shape/opacity/strokeWidth/strokeDash/angle, x/yOffset, Parallel dimensions, axes/grids, legend binding/sampling/block recipe, dynamic reference axis |
| coordinate | layer.coordinate, annotation data space, axis/grid placement, retained/local composition recipe |
| mark | attached label source, dynamic reference source, selection target, owned-child relation |
| selection | highlight selection, R32 named label selection |

`context.currentData/currentScale/currentCoordinate`는 context strength다. historical trace는 제외한다. retained source/template는 replay에 쓰이므로 live다. retained program 안의 ID namespace는 그 program 내부에서만 해석한다.

### removal algorithm

1. kind-specific selector로 exact ID와 ownership을 resolve한다.
2. chart-owned internal 여부를 stored ownership metadata로 판정한다. 이름으로 추측하지 않는다.
3. `collectResourceReferences`를 호출한다. standalone logical data의 removeData에서만 owner.current 자기 edge를 제외한다.
4. live edge가 하나라도 있으면 sorted `ownerKind/ownerId/path`를 포함한 Error를 던지고 아무 write도 하지 않는다.
5. live 0이면 semantic resource, resolved cache, 직접 config, 자기-owned이며 이제 unused인 graphic/helper만 제거한다.
6. context edge만 있으면 pointer를 unset한다. 다른 resource를 current로 자동 선택하지 않는다.
7. standalone logical data는 logical owner registry와 current snapshot을 같이 제거하되 원본 upstream source는 유지한다.
8. 성공 후 visible graphic deep equality와 same-run Canvas/PNG equality를 검사한다. 변화하면 collector가 숨은 consumer를 놓친 것이다.

`src/actions/resources/remove.js`를 새 owner로 만들고 Full registrar에만 연결한다. 기존 `removeMark`, `removeEncoding`, `releaseDerivedData`, `removeMarkSelection`의 preflight가 같은 collector를 재사용하되 기존 public behavior를 바꾸지 않는다.

### one-edge fixtures

새 `test/contracts/remove-resources.test.js`에서 각 live path마다 다른 edge를 모두 제거한 fixture를 만든다. 여러 edge가 동시에 있는 fixture 하나로 registry 전체를 검증했다고 간주하지 않는다.

- unused D/S/C 삭제, context-only 삭제, trace-only 삭제 성공.
- Parallel dimension만 S를 참조, retained facet만 D를 참조, named label만 selection을 참조하는 각각의 오류.
- error referrer order는 insertion order와 무관해야 한다.
- theme token 문자열이 resource ID와 같아도 edge로 잡지 않는다.
- 마지막 mark/label 제거 후 logical data 삭제 성공, upstream source 유지.
- wrong kind/internal/unknown은 canonical state와 caller input이 동일한 오류다.

## 7. Phase 12 — 전체 통합과 main merge 전 closeout

### machine reconciliation

1. `PROPOSALS.json`, `IMPLEMENTATION_MAP.json`, feature files의 25개 ID set을 exact 비교한다.
2. 모든 feature status가 Implemented-primary 이상이고 `ACCEPTANCE_CASES.json`의 각 case가 실제 test path+revision을 가져야 한다.
3. 각 direct action은 Current contract owner 정확히 하나, ACTION_INDEX entry, executable test, type method, intent provider, package consumer를 가져야 한다.
4. required integration cell에 planned/partial/pending이 하나라도 있으면 Roadmap을 completed로 바꾸지 않는다.
5. completed roadmap 문서를 stable product test에서 import하지 않는다.

### four cumulative programs

각 프로그램은 before program 불변, deterministic trace, literal semantic/graphic assertion, applicable renderer, packed install 실행을 가진다.

1. complete → impute → computed → normalize → window → weighted summary → R02 source revision.
2. atomic x/y/color/stroke/size → combined legend values/block/display map → selected semantic labels → dynamic reference → custom theme/style.
3. R27 aspect + R29 Polar frame → Polar facet → source replay → theme → Canvas resize.
4. Parallel dimension scale → repeat dimension substitution → facet shared domains → labels/guides → unused resource removal.

### exact generation and validation order

Owner source를 먼저 고친 다음 실행한다.

```sh
npm run contracts:catalog
npm run contracts:relations
npm run contracts:cards
npm run docs:generate
npm run test:unit
npm run test:contracts
npm run test:charts
npm run test:gates
npm run test:render
npm run test:browser
npm run test:realistic
npm run contracts:catalog:check
npm run contracts:relations:check
npm run contracts:cards:check
npm run test:docs
npm run package:check
npm run package:pack
npm run test:package -- /absolute/path/to/packed.tgz
npm run package:bundle
npm test
git diff --check
```

환경 preflight가 성공하면 docs built/browser와 realistic audit를 추가한다. skip/failure를 passed로 기록하지 않는다. package tar SHA-256, entry count, packed/unpacked bytes, full/basic/svg gzip을 Phase 12 STEP에 적는다.

### closeout and external actions

1. 제품 commit을 push한다.
2. feature/PROPOSALS/IMPLEMENTATION_MAP/ACCEPTANCE_CASES/TRACEABILITY/Phase STEP/GOAL/ROADMAP/ROADMAP_INDEX를 실제 revision과 수치로 맞추고 기록 commit을 push한다.
3. 사용자가 이미 승인한 범위에 따라 동일 verified head로 PR을 만들고 required CI를 확인해 main에 merge한다.
4. Roadmap 7 관련 open issues를 구현·검증 근거와 merge revision으로 닫는다.
5. package publish와 docs deployment는 현재 승인 범위가 아니므로 별도 명시 요청 전 실행하지 않는다.

## 8. 기능별 완료 보고 형식

```text
Feature / Phase:
Product revision:
Public API and type change:
Canonical requested owner:
Resolved/cache output:
Cleanup and transition behavior:
Literal normal/boundary/error/lifecycle oracles:
Focused test result:
Cumulative test result:
Renderer result:
Packed package SHA-256 and bundle sizes:
Current/knowledge/generated owners updated:
Deferred integration cells and exact owner Phase:
Next feature:
```

“코드가 존재한다”, “테스트를 실행할 예정이다”, “한 renderer에서 보인다”는 완료 근거가 아니다. 표의 상태를 먼저 바꾸고 나중에 제품을 맞추지 않는다.
