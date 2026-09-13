# Roadmap 7 — 무추론 구현 명세

작성 기준: 2026-09-13. 기준 branch `codex/roadmap7-authoring-refinement`, 현재 제품 인계 기준 HEAD는 `c29f496c`다. Phase 9는 제품 checkpoint `1c5192f2`와 상태 checkpoint `39be3e3e`, Phase 10은 foundation `89f1c54e`, runtime `4dbdaf85`, 종료 checkpoint `ebf3562a`, Phase 11 R25는 제품·Current·문서·설치 패키지 `c29f496c`에서 완료됐다. 현재 실행점은 Phase 12 전체 통합이다.

이 문서는 구현자가 설계를 새로 해석하지 않고 남은 Roadmap 7을 실행하도록 만든 코드 수준 명세다. 공개 의미·기본값·수식은 각 `features/*.md`가 소유하고, 이 문서는 **수정 파일, 함수 경계, 상태 경로, 실행 순서, 삭제 규칙, 테스트 묶음과 종료 조건**을 소유한다. 두 문서가 다르면 feature 계약을 따르고 같은 checkpoint에서 이 문서를 고친다. 완료된 R02/R05/R06/R07/R08/R09/R10/R19/R20/R21/R22/R23/R27/R29/R31/R32/R33/R36/R37/R38/R39/R43/R47/R49 제품 코드는 다시 구현하지 않는다. R31/R32/R33/R37/R38/R39/R47/R49의 non-Cartesian facet/repeat 소비 cell은 R43 `ebf3562a`에서 검증됐다.

## 0. 현재 인계 상태와 다음 실행점

이 표는 계획 상태가 아니라 실제 push된 제품 증거를 기준으로 한다. `implemented candidate`는 코드가 있다는 뜻이며 Current 계약·공개 문서·installed package·전체 회귀가 끝났다는 뜻이 아니다.

| 범위 | 실제 상태 | 재사용할 revision | 다음 작업 |
| --- | --- | --- | --- |
| Phase 0–8 | 완료 | 각 STEP 결과 원장, Phase 8 `20a25911` | 재구현 금지; R25 consumer 회귀만 추가 |
| Phase 9 R47/R49 | 완료 | `1c5192f2`, `39be3e3e` | 재구현 금지; R25/Phase 12 회귀만 추가 |
| Phase 10 W10.1–W10.3 | 완료 | `89f1c54e`, `ebf3562a` | 재구현 금지 |
| Phase 10 W10.4–W10.5 | 완료 | `4dbdaf85`, `ebf3562a` | 재구현 금지 |
| Phase 10 W10.6 | 완료 | `ebf3562a`; Phase 10 STEP 원장 | Phase 12 누적 회귀만 |
| Phase 11 R25 | 완료 | `c29f496c` | 재구현 금지; Phase 12 누적 cleanup flow만 검증 |
| Phase 12 통합 | active | 없음 | 25개 exact reconciliation, 네 누적 flow, 전체 검증과 main 반영 |

### 인계 직후 실행할 명령

다른 디렉터리를 조사하지 않는다. 아래 명령은 저장소 root에서 실행한다.

```sh
git status --short
git branch --show-current
git log -3 --oneline
npm run test:unit
npm run test:contracts
```

예상 branch는 `codex/roadmap7-authoring-refinement`, 예상 최신 두 제품 commit은 `4dbdaf85`, `89f1c54e`다. working tree가 더 최신이면 사용자 작업을 되돌리지 말고 diff를 분류한다. pass count가 달라도 test 0 failure가 우선이며, 숫자를 문서에 억지로 맞추지 않는다.

### Phase 10에서 완료한 여섯 가지 감사

아래 여섯 항목은 `ebf3562a`에서 Current·문서·설치 패키지와 함께 닫혔다. 후속 구현자는
성공 fixture를 복제하거나 다른 API로 다시 만들지 말고 Phase 12 누적 회귀에서 보존한다.

1. **3-pass atomicity**: `derive.js`가 candidate 생성, 전체 child domain 해결, 최종 materialization을 논리적으로 분리하는지 확인한다. 현재 함수명이 다르거나 `deriveCellProgram` 안에 남아 있으면 W10.2의 세 이름으로 추출한다. 첫 child의 graphic materialization이 둘째 child의 domain 오류보다 먼저 caller-visible parent state를 만들 수 없어야 한다.
2. **transform 뒤 empty**: raw partition에는 행이 있지만 row-preserving filter 또는 통계 transform 뒤 final rows가 0인 cell을 만든다. shared/explicit domain은 semantic layer·coordinate·정상 empty graphic·local guide를 유지하고, independent auto는 고정 오류를 내며 원본 8개 branch와 `_actionSequence`를 보존해야 한다.
3. **source-owned Text lifecycle**: R31/R32/R33의 attached label이 있는 Polar unit을 facet/facetGrid하고 source edit, scale edit, theme, Canvas edit를 거친다. 각 child가 자신의 final items로 membership/placement/leader를 다시 계산해야 한다. `repeatCharts`가 primary mark 하나와 그 mark의 dependent label을 함께 반복할 수 있는 것이 승인 계약이면 dependent Text를 eligible-layer count에서 제외하고 같은 replay를 검증한다. 독립 Text layer나 다른 source의 label은 여전히 거부한다.
4. **composition Canvas replay**: unit을 먼저 resize한 뒤 `editFacetSource`하는 경우뿐 아니라 facet/repeat parent에서 지원되는 Canvas edit 진입점이 retained source와 모든 child의 local range/frame을 다시 계산하는지 확인한다. 공개 parent edit가 현재 계약상 없다면 성공을 모사하지 말고 R43 feature와 Current 계약에 정확한 제한을 한 곳에 기록한다.
5. **full-grid empty non-Cartesian panel**: Polar와 Parallel 각각에 missing pair를 만든다. header slot과 grid coordinate가 유지되고 sibling이 이동하지 않으며, shared domain의 axes/grid는 empty child의 local coordinate를 사용해야 한다. Pie/Rose/Radar empty graphic은 family의 canonical empty representation과 일치해야 한다.
6. **public/package closeout**: `types/program.d.ts`, strict positive/negative type fixture, `agent_docs/contract/current/COMPOSITION.md`, `ACTION_INDEX.json`, action relations/cards, `docs/api/composition.md`, generated reference, packed Node/TypeScript/MCP consumer가 `theta`, public `r`, `parallelDimensions`, `{parallelDimension}`과 거부 표를 같은 의미로 노출해야 한다.

여섯 감사의 제품 checkpoint는 `ebf3562a`이고, 별도 상태 checkpoint에서 feature/Phase/PROPOSALS를
닫고 `activePhase`를 11로 이동했다.

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

상태: **Implemented-primary**. `8760111d`의 제품 코드를 다시 만들지 않는다. `547eae1b`가 independent lower-level/public graphic·decoded-PNG parity를 소유한다. 아래 내용은 R38/R43/R47 consumer가 따라야 할 회귀 계약이다.

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

상태: **Implemented-primary (`7ffafe02`)**. 아래 내용은 구현을 다시 만드는 지시가 아니라 R39 `labelMap`, R43 facet/repeat, R47 custom theme와 Phase 12 closeout이 보존해야 하는 회귀 계약이다. Runtime owner는 `src/actions/guides/legends/blocks.js`와 `target.js`/`transition.js`다.

#### public action과 block identity

새 action은 Full-only다. target은 기존 legend owner target, channel은 현재 logical block member다. editable field가 하나 이상 필요하다.

```ts
type EditLegendBlockOptions = {
  target: string;
  channel: LegendChannel;
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly CategoryValue[];
  gap?: number;
  text?: { fontSize?: number; fontFamily?: string; fontWeight?: string | number; color?: string };
  symbol?: { size?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
};
```

R38에서는 `labelMap`을 받지 않는다. 해당 키는 runtime unknown-key 오류이고 TypeScript에서도 거부한다. R39가 구현될 때만 같은 options type에 `labelMap?: DisplayLabelMap | "auto"`를 추가한다.

`src/actions/guides/legends/target.js`에 private descriptor를 추가한다.

```js
{
  target,
  key: JSON.stringify([...channels].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)),
  channels: frozenSortedChannels,
  kind,
  family,
  scaleIds,
  config
}
```

실제 구현은 locale sort 대신 ASCII comparator를 쓰며 config의 원본 channels 배열을 변경하지 않는다. graphic ID/index는 identity가 아니다. merged color+shape에서 color와 shape는 같은 descriptor를 선택한다. content/style recipe 복제 객체는 만들지 않는다.

#### storage와 patch 규칙

canonical owner는 `materializationConfigs.guides.legend[kind].blockOverrides[descriptor.key]`다. 별도 `guides.legendBlocks` sibling을 만들지 않는다. config가 target과 kind를 이미 소유하므로 R38 override에는 title/text/symbol/gap만 저장하고 resolved geometry나 graphic IDs를 저장하지 않는다. R39 구현 뒤에는 같은 entry가 labelMap도 소유한다. values/count는 R37 sampling, order는 semantic guide가 유일 owner다.

- title은 모든 block에서 허용하고 `""`는 제목 숨김이다. semantic title은 nonempty validator를 유지하므로 마지막 nonempty title을 보존하고 effective `titleVisible:false`로 materialize한다.
- values/count는 R37 sampled block만 허용하며 sampling owner로 전달한다.
- order는 categorical block에서 current raw domain의 exact typed permutation만 허용한다.
- gap은 finite nonnegative다.
- text/symbol object는 그 하위 object 전체 교체다. text는 label font/color만 바꾸고 title font style은 건드리지 않는다. 생략 property는 현재 root common style로 돌아간다.
- data mapping과 같은 visual property는 constant override로 덮을 수 없다: size block의 symbol.size, opacity의 opacity, strokeWidth의 strokeWidth, color의 fill, stroke의 stroke는 오류다.

#### 코드 owner와 transition

1. 새 `src/actions/guides/legends/blocks.js`에 resolver, validator, action, effective-config applicator를 둔다. exact helper/state/transaction/transition 표는 [R38 feature의 현행 코드 무추론 명세](features/38-legend-blocks.md#현행-코드에-대조한-무추론-구현-명세)가 canonical owner다.
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

Phase 9 구현자는 이 절과 함께 아래 두 canonical feature 계약을 반드시 읽는다.

- [R47 custom theme canonical spec](features/47-custom-theme.md): exact public types, 18-token schema, provenance frame state, composition 전파/복원, font/layout 순서, 오류와 acceptance oracle
- [R49 shape style canonical spec](features/49-shape-style-details.md): family matrix, requested owner, rounded-path commands, rect/path transition, stroke bounds, renderer/facade/legend/highlight와 acceptance oracle

두 feature 문서가 API와 의미의 최종 owner다. 이 절은 실행 순서와 cross-feature 종료 조건만 소유한다.

### R47 실행 순서

1. `src/theme/defaults.js`에 18-key closed schema, `normalizeThemeDefinition`, `resolveThemeTokens`를 구현한다.
2. 기존 theme state를 canonical frame state로 lazy-adopt하고 같은 owner upsert/remove helper를 pure test로 고정한다.
3. unit built-in/custom transition을 before/after effective tokens로 reconcile한다.
4. explicit color/font와 default highlight provenance를 trace에서 값 비교 없이 수집한다.
5. composition `self`와 `descendants`를 분리하고 current children, nested compositions, retained facet/repeat source에 owner frame을 postorder로 전파한다.
6. parent remove는 자기 owner frame만 제거해 아래 child local/other parent frame을 복원한다.
7. font change는 text → labels → axes → legends → title → headers → unit layout → nested/outer composition layout 순서로 계산한다.

Theme precedence는 `explicit user style > latest applicable theme frame > earlier frame > built-in light`다. unit/local 여부에 고정 우선순위를 부여하지 않는다. 새 custom 요청은 이전 custom partial token과 merge하지 않는다.

### R49 실행 순서

1. `src/grammar/strokeStyle.js`와 `src/grammar/roundedRect.js` pure helper를 먼저 구현한다.
2. concrete circle/rect/line/path schema와 painted bounds를 확장한다.
3. primitive Canvas/SVG/PDF에서 cap/join/miter attrs와 context reset을 검증한다.
4. direct Bar/Rect rounded path와 모든 strokable mark requested state/materializer를 연결한다.
5. 기존 facade nested style object, automatic legend symbol, source highlight clone을 연결한다.
6. resize/reencode/theme/facet replay와 package consumer를 검증한다.

Rounded Rect/Bar는 requested radius를 config에 보존하고 item마다 clamp한다. r=0 item은 rect, r>0 item은 shared 10-command cubic path다. path가 하나라도 있으면 stable owner는 typed-item collection이고 전부 r=0이면 homogeneous rect로 복귀한다. cap/join/miter의 default는 butt/miter/10이며 Canvas/PDF는 매 stroke마다 세 값을 명시한다.

### Phase 9 closeout fixture

custom theme의 mark/text/highlight tokens, R38 block override, R39 header/font, R49 explicit round/cap/join을 같은 chart에 적용한다. 다음을 한 lifecycle에서 확인한다.

1. explicit property가 theme보다 우선한다.
2. custom A→B transition에서 A-only token은 B base로 돌아간다.
3. parent descendants 제거 뒤 child local theme가 복원된다.
4. R49 requested style과 actual radius가 분리되어 resize 뒤 다시 clamp된다.
5. legend/highlight/facet replay가 source style과 theme policy를 유지한다.
6. Canvas/SVG/PDF가 같은 concrete commands와 attrs를 소비한다.

## 5. Phase 10 — R43 non-Cartesian facet/repeat — 완료

### 현재 코드 기준선과 먼저 제거할 오해

이 절의 경로와 함수 이름은 Phase 10 구현 전 출발점 `31a2eee9`를 기록한다. 아래 제한은
`89f1c54e`, `4dbdaf85`, `ebf3562a`에서 제거됐으며, 현재 구현에 다시 도입하면 회귀다.

- 구현 전 `src/grammar/facets/index.js`의 `requireSupportedLayer`는 x/y Cartesian 완성도만 요구하고 Arc·Polar·Parallel을 거부했다.
- 구현 전 `src/actions/facets/actions.js`의 `resolveRepeatDefinition`은 `"x" | "y"`, 직접 Cartesian mark 하나, transform 없는 dataset만 허용했다.
- 구현 전 `src/core/vocabulary.js`의 `FACET_SCALE_CHANNELS`에는 theta/r와 Parallel dimension policy가 없었다. `stroke`는 기존 channel을 그대로 재사용했다.
- 구현 전 `src/actions/facets/derive.js`는 빈 partition에서 source mark를 삭제했다. 현재는 semantic layer·coordinate와 canonical empty graphic을 보존한다.
- `src/materialization/facetGuides/placement.js`는 x/y axis만 child ownership 대상으로 본다. Polar/Parallel axis를 outer로 승격하는 코드를 추가하지 않는다.
- `compositionSpec.facet`이 field/grid/repeat/scales/guides를 보존하고 `children`이 실제 child program을 보존한다. 별도 serialized source snapshot을 중복 추가하지 않는다.

R43은 위 제한을 단순히 지우는 작업이 아니다. family 판정, partition/replay, scale-domain resolution, local coordinate, guide ownership을 같은 transaction에서 완성해야 한다.

### 공개 타입과 canonical 저장 형태

제품 선언은 `types/program.d.ts`의 기존 타입을 아래처럼 확장한다. `stroke`는 기존 field를 그대로 사용한다.

```ts
export interface FacetScaleResolutions {
  // existing x/y/xOffset/yOffset/color/stroke/size/shape/opacity/strokeDash
  theta?: "shared" | "independent";
  r?: "shared" | "independent";
  parallelDimensions?: "shared" | "independent";
}

export type RepeatChannel =
  | "x"
  | "y"
  | "theta"
  | "r"
  | { readonly parallelDimension: string };
```

규칙은 다음과 같다.

1. public key는 `r` 하나다. `scales.radius`, repeat channel `"radius"`, `{parallelDimension:""}`는 type과 runtime 모두 거부한다.
2. `compositionSpec.facet.scales`에는 public round-trip 형태인 `r`를 저장한다. layer 조회와 scale binding에서만 `r -> radius`로 한 번 변환한다. 동일 object에 `r`와 `radius`를 같이 저장하지 않는다.
3. facet/facetGrid의 새 policy 기본값은 shared다. repeatCharts는 기존 x/y 동작처럼 **교체되는 역할 하나만** 명시 요청이 없을 때 independent로 덮어쓴다. 다른 channel 기본은 shared다.
4. `parallelDimensions`는 v1에서 모든 dimension에 적용되는 단일 policy다. dimension별 policy map을 받지 않는다.
5. `compositionSpec.facet.repeat.channel`은 string 또는 frozen `{parallelDimension}` object를 그대로 보존한다. resolved dimension index를 requested state로 저장하지 않는다.

`src/core/vocabulary.js`에는 public option key와 semantic scale binding을 분리한다.

```js
FACET_SCALE_OPTION_KEYS = [
  "x", "y", "xOffset", "yOffset", "theta", "r",
  "color", "stroke", "size", "shape", "opacity", "strokeDash",
  "parallelDimensions"
];

facetSemanticChannel("r") === "radius";
```

기존 `FACET_SCALE_CHANNELS`를 public key 목록으로 재정의하거나 위 별도 상수를 추가할 수 있지만, `layer.encoding.r`를 읽는 구현은 금지한다. `editFacetScales` unknown/applicability 검사, `usedFacetScalePolicies`, `normalizeFacetScalePolicies`가 같은 상수와 adapter를 사용해야 한다.

### 내부 family와 binding descriptor

`src/grammar/facets/dependencies.js`에 pure `resolveFacetFamily`와 `collectFacetScaleBindings` 역할을 둔다. 함수가 반환하는 최소 형태는 다음과 같다.

```ts
type FacetFamily = "cartesian" | "polar" | "parallel";
type FacetScaleBinding = {
  layerId: string;
  scaleId: string;
  policyKey: keyof FacetScaleResolutions;
  semanticChannel: string;
  dimensionField?: string;
  dimensionIndex?: number;
};
```

- Cartesian primary layer는 기존 지원표를 그대로 따른다.
- Polar primary layer는 coordinate type이 polar이고 Point/Line/Arc가 완성된 theta/radius recipe를 가져야 한다. Pie는 radius encoding이 없어도 완성된 theta aggregate Arc로 인정한다.
- Parallel primary layer는 coordinate type parallel, Line, `encoding.parallel.dimensions.length >= 2`, 모든 dimension scale 존재를 요구한다.
- source-owned Text, attached label, statistical-reference child는 primary family 판정에서 제외하고 source owner와 함께 replay할 dependent로 수집한다.
- primary layers가 Cartesian/Polar/Parallel을 섞으면 facet/facetGrid 전에 오류다. concat이 가능한 사실을 mixed-family facet 허용으로 해석하지 않는다.

binding은 ordinary encoding의 실제 `scale`과 Parallel `dimensions[i].scale`을 모두 수집한다. Parallel은 각 scale ID를 별도 binding으로 만들되 policyKey는 모두 `parallelDimensions`다. 같은 scale ID가 서로 다른 policy key에 묶여 conflict하면 기존 conflicting-channel error 규칙을 사용한다.

Pie/Rose/Radar repeat 판정을 trace 문자열에 의존하지 않는다. 다음 explicit requested marker를 해당 facade가 mark config에 기록한다.

```ts
compositionRole?: "pie" | "rose" | "radar" | "polar-line" | "polar-point" | "parallel";
```

`createPiePlot`, `createRosePlot`, `createRadarPlot`, `createPolarLinePlot`, `createPolarScatterPlot`, `createParallelCoordinates`가 자신의 stable owner config에 이 값을 쓴다. 기존 config를 교체하지 말고 merge한다. marker가 없는 direct primitive는 semantic encoding으로 판정한다. marker가 없는 closed Polar Line처럼 Radar와 구별할 수 없는 경우 repeat만 보수적으로 거부하고 facet/facetGrid는 허용한다.

### W10.1 — family preflight와 dependency DAG

수정 순서는 다음과 같다.

1. `src/grammar/facets/index.js`
   - `requireSupportedLayers`가 `resolveFacetFamily`를 호출하고 family를 definition에 포함한다.
   - facet field와 grid field 검증, child/work budget는 기존 순서를 유지한다.
   - family/모든 layer 완성도 검사를 `planFacetDependencies`와 child ID 생성 전에 끝낸다.
2. `src/grammar/facets/dependencies.js`
   - dataset path의 기존 source/row-preserving/statistical 분류를 보존한다.
   - 반환값에 `family`, `primaryLayers`, `dependentLayers`, `scaleBindings`, `coordinates`를 추가한다.
   - replay 배열은 topology 순서이고 각 entry의 현재 `kind`을 보존한다. row-preserving 뒤 statistical이 실행되는지 test에서 확인한다.
   - Parallel dimension, mark selection/label recipe, dynamic reference population, legend recipe, theme/style은 dataset transform으로 위장하지 말고 별도 dependent descriptor로 둔다.
3. 모든 collector는 known schema property만 읽는다. `JSON.stringify(program).includes(id)`, key 이름 재귀 검색, trace 검색을 쓰지 않는다.

dependency 결과는 clone-and-freeze한다. 같은 dataset이 여러 layer path에 나타나도 replay ID는 한 번만 나오며, 깊이가 같으면 원래 semantic dataset 순서가 tie-break다.

### W10.2 — child를 만드는 3-pass transaction

기존 `deriveCellProgram` 한 번으로 filtering부터 final graphics까지 끝내지 않는다. `src/actions/facets/derive.js`를 다음 세 역할로 나눈다.

```text
buildFacetCellCandidate    // partition, transform replay, semantic rebind; final mark materialization 금지
resolveFacetChildrenScales // 모든 candidate를 보고 shared/independent domain 결정
materializeFacetCell       // resolved domain/local frame 적용 후 marks→guides→labels/theme/style
```

각 public facet/facetGrid는 다음 순서를 정확히 지킨다.

1. original unit program과 caller options의 canonical snapshot을 잡는다.
2. 모든 requested values/grid combinations와 dependency plan을 검증한다.
3. 각 cell에서 anchor source를 filter한다. grid는 row filter 뒤 column filter의 현재 결정적 ID 규칙을 유지한다.
4. partition된 source를 입력으로 row-preserving transform을 replay하고 그 뒤 statistical transform을 topology 순서로 replay한다.
5. layer data reference와 statistical reference `dataId`, gradient profile source/profile 같은 config reference를 **semantic candidate**에 rebind한다.
6. candidate 단계에서는 public `bindMarkData`를 호출하지 않는다. 그 action은 즉시 materialize하므로 empty/shared domain을 알기 전에 실패할 수 있다. facet 전용 wrapped child `rebindFacetLayerData`를 `src/actions/facets/replay.js`에 두고 `editSemantic`만 실행한다.
7. 모든 nonempty candidate의 effective values로 domain을 계산한다. empty candidate는 domain sample에 참여하지 않는다.
8. policy별 domain을 각 child `resolvedScales`에 넣고 child-local Canvas/coordinate range를 다시 계산한다.
9. marks, source-dependent labels/references, local guides, theme/style/highlight를 결정적 plan으로 materialize한다.
10. 모든 child가 성공한 뒤에만 `applyCompositionState`로 parent children/compositionSpec을 commit한다.

어느 cell이든 실패하면 원본의 semanticSpec, graphicSpec, resolvedScales, materializationConfigs, children, compositionSpec, context, trace, `_actionSequence`가 변하지 않아야 한다. 보상 rollback을 작성하지 않는다. private candidate가 실패해도 그 trace/ID는 반환 program에 들어가지 않는다.

#### 빈 panel 규칙

- 빈 cell도 원래 semantic layer와 configs, coordinate, child ID를 유지한다.
- concrete mark owner는 해당 type의 정상 empty 형태를 사용한다. collection이면 items `[]`, 단일 path 계열이면 empty collection 또는 family가 이미 사용하는 empty representation을 한 곳에서 정한다. source layer를 삭제하지 않는다.
- shared 또는 explicit domain이면 local axes/grid를 materialize할 수 있다.
- independent auto policy가 필요한 scale에 값이 없으면 `Facet child "<id>" cannot resolve independent scale "<scale>" from an empty partition.` 형태의 오류를 child 생성 전 preflight 결과로 낸다.
- 모든 cells가 empty이면 기존 `requires at least one populated cell` 오류를 유지한다. 임의 `[0,1]` domain을 만들지 않는다.

### W10.3 — scale domain과 local coordinate

`src/grammar/facets/scales.js`의 public 함수는 기존 이름을 유지하고 binding-aware 입력을 받도록 확장한다.

1. `normalizeFacetScalePolicies`는 public option keys를 closed validation하고 `{channels, scales, bindings}`를 반환한다.
2. `resolveFacetScaleDomains`는 ordinary scale과 Parallel dimension scale을 동일 scale-ID 단위로 처리한다.
3. explicit semantic domain은 shared/independent 모두 우선한다.
4. quantitative/temporal continuous shared domain은 child-local effective domain들의 min/max union이다. scale `zero`, `nice`, transform은 각 child에서 이미 적용된 동일 정책을 사용한다.
5. nominal/ordinal shared domain은 explicit requested domain이 있으면 그대로, auto면 partition order의 typed first-appearance union이다. 문자열 `"1"`과 숫자 `1`을 합치지 않는다.
6. Parallel shared domain은 dimension field별 scale ID로 union한다. dimension a와 b의 값을 한 array로 합치지 않는다.
7. shared는 domain만 공유한다. resolved range, polar frame center/radius, Parallel dimension x position은 child Canvas bounds에서 다시 계산한다.

고정 pure tests:

- Polar r: A `[1,2]`, B `[10,20]`, `zero:false`, `nice:false` → shared `[1,20]`; independent A `[1,2]`, B `[10,20]`.
- theta ordinal: A `["a","b"]`, B `["b","c"]` → shared `["a","b","c"]`.
- Parallel: a A/B union `[0,2]`, b A/B union `[0,2000]`; a와 b domain object가 reference와 값 모두 분리.
- reverse/radialMapping은 domain union을 뒤집지 않고 mapper/range 단계에서 적용.

### W10.4 — repeat role substitution

`resolveRepeatDefinition`을 export하지 않은 pure helper로 유지하되 closed dispatch를 추가한다.

```text
"x"                 -> encodeX
"y"                 -> encodeY
"theta"             -> encodeTheta
"r"                 -> encodeR, stored semantic channel radius
{parallelDimension}  -> encodeParallelCoordinates의 dimensions list 교체
```

모든 fields를 먼저 검사하고 하나라도 실패하면 child를 만들지 않는다.

- x/y의 기존 direct Cartesian 제한과 오류를 보존한다.
- Polar Point/Line의 theta/r는 원래 encoding의 fieldType, temporalUnit, aggregate/bin/stack/weight, scale request를 그대로 쓰고 field만 교체한다.
- direct Arc와 Rose는 교체하는 semantic role이 실제 field-bound일 때만 허용한다. Rose r measure 교체는 aggregate와 radialMapping을 보존한다.
- Pie marker 또는 theta aggregate-only Arc는 theta/r repeat를 거부한다.
- Radar marker는 theta/r repeat를 거부한다. ordinary closed Polar Line marker는 Polar Line 규칙을 따른다.
- Parallel object는 key가 정확히 `parallelDimension` 하나여야 한다. 원래 dimensions에서 field가 정확히 한 번 일치해야 한다.
- Parallel replacement field는 source rows에서 원래 fieldType과 호환돼야 하고 sibling dimension field와 중복되면 오류다.
- Parallel child는 교체 dimension의 `field`, `title`, scale definition/domain을 새 field에 맞게 만들고 index와 다른 dimensions/key/missing 정책을 보존한다. title은 원래 title이 field와 같았으면 새 field로, explicit custom title이면 그대로 보존한다.
- computed AST, label text, config 문자열을 전역 replace하지 않는다.

repeat child ID는 기존 `${id}-field-${index+1}` 규칙을 유지한다. fields order가 child order와 header values order다.

### W10.5 — family materialization, guides, replay

`materializeFacetCell`은 기존 materialization planner를 사용한다. 별도 semantic-to-graphic compiler를 만들지 않는다.

1. child-local Canvas와 `editCoordinate`가 저장한 R27 aspect/R29 polarFrame requested state를 적용한다.
2. Point/Line/Arc/Parallel mark를 materialize한다. Pie share의 분모는 현재 partition의 유효 measure 합이다.
3. R32 selection membership과 R33 label placement를 현재 child final items에서 다시 계산한다.
4. R36 statistical reference는 child의 rebound population/data ID를 사용한다.
5. Polar theta/radius axes/grid와 Parallel axes는 각 child 내부에서 유지한다.
6. `guides.axes:"outer"`는 family가 polar 또는 parallel이면 public action, `editFacetGuides`, `editFacetSource` 모두 같은 오류로 거부한다.
7. shared legend는 color/stroke/size/shape/strokeDash/opacity 등 기존 compatible family만 parent로 승격한다. theta/r/Parallel positional axis를 legend로 승격하지 않는다.
8. R37 exact samples, R38 blockOverrides, R39 labelMap과 header strips의 requested state가 모든 child에서 같아야 shared legend compatibility가 성립한다.
9. R47 theme frame을 child materialization 뒤 재생하고 R49 explicit style을 덮지 않는다. highlight는 최종 source graphic을 clone한다.
10. `materializeFacetGraphics`는 child snapshot을 namespace/translate만 한다. family geometry를 parent에서 다시 계산하지 않는다.

`editFacetScales`, `editFacetGuides`, `editFacetSource`와 composition theme replay가 모두 위 동일 pipeline으로 들어온다. Canvas는 composition parent action이 아니라 revised unit의 `editCanvas` 뒤 `editFacetSource`를 호출해 replay한다. initial create에만 통과하는 별도 분기를 만들지 않는다.

### W10.6 — 파일별 테스트 배치와 종료 판정

아래 파일을 역할 owner로 사용한다.

| 파일 | 반드시 소유할 검증 |
| --- | --- |
| `test/unit/grammar/facet-dependencies.test.js` | family/dependent/DAG/binding descriptor와 cycle/missing refs |
| `test/unit/grammar/facet-scales.test.js` | theta/r adapter, typed union, Parallel field별 domains, empty policy |
| `test/unit/actions/composition/polar-facets.test.js` | Point/Line/Arc/Pie/Rose/Radar facet+grid, source replay |
| `test/unit/actions/composition/parallel-facets.test.js` | dimensions domain/order/axes/empty/source replay |
| `test/unit/actions/composition/non-cartesian-repeat.test.js` | theta/r/parallelDimension 성공·거부·title/scale 이동 |
| `test/contracts/polar-parallel-facets.test.js` | R43-N01..L02, immutability, full lifecycle, package-independent public surface |
| `test/contracts/composition-phase10-types.test.js` | 새 positive union과 `radius`, empty object, duplicate shape의 type errors |
| `test/contracts/composition-family-matrix.test.js` | 기존 explicit unsupported test를 required matrix 성공/explicit rejection으로 교체 |

family matrix는 다음 evidence를 빠짐없이 가진다.

| family | facet | facetGrid | repeat | renderer |
| --- | --- | --- | --- | --- |
| Polar Point | required | required | theta,r | Canvas/SVG/PNG/PDF |
| Polar Line | required | required | theta,r | Canvas/SVG/PNG/PDF |
| Arc direct | required | required | direct-bound theta/r | Canvas/SVG/PNG/PDF |
| Pie | required | required | rejected | Canvas/SVG/PNG/PDF |
| Rose | required | required | theta,r measure/category role | Canvas/SVG/PNG/PDF |
| Radar | required | required | rejected | Canvas/SVG/PNG/PDF |
| Parallel | required | required | parallelDimension | Canvas/SVG/PNG/PDF |

각 성공 test는 caller options deep-freeze, original program 8개 branch와 `_actionSequence` 불변, child ID/order, semantic data rebinding, concrete item count/path, local frame/range를 검사한다. renderer test는 같은 `graphicSpec`을 소비하는지 확인하며 renderer 안에서 semantic family를 다시 추론하지 않는다.

Phase 10은 아래 조건을 모두 충족해 `ebf3562a`에서 종료됐다.

- 7 family의 facet/facetGrid와 표의 repeat cell이 실제 runtime/type test를 통과한다.
- `editFacetSource`의 data revision, `editFacetScales`, Canvas, theme, labels/highlight/style lifecycle이 통과한다.
- Current COMPOSITION contract, ACTION_INDEX coverage, docs composition/Polar/Parallel pages와 generated artifacts가 실제 제품과 같다.
- packed tarball의 Node, strict TypeScript, MCP consumer가 새 union을 사용한다.
- 기존 Cartesian facet/grid/repeat 전체 회귀와 chart/render/browser suite가 통과한다.

## 6. Phase 11 — R25 safe named resource removal

### 공개 API, 적용 범위, 오류 형식

Full entry에만 다음 direct actions를 추가한다.

```ts
removeData(options: { readonly id: string }): ChartProgram;
removeScale(options: { readonly id: string }): ChartProgram;
removeCoordinate(options: { readonly id: string }): ChartProgram;
```

- options는 plain object이고 key는 `id` 하나다. omission, empty string, unknown key, wrong kind를 거부한다.
- target/context inference, batch, cascade, force 옵션을 추가하지 않는다.
- unit과 facet composition parent에서 reference preflight를 수행한다. composition parent의 retained source/child가 target을 참조하면 거부한다.
- 성공은 visible graphic과 children을 바꾸지 않는다. 삭제 때문에 domain/layout을 다시 추론하지 않는다.

오류 메시지의 안정 형식은 다음과 같다.

```text
Cannot remove <kind> "<id>"; live references: <ownerKind> "<ownerId>" at <path>; ...
```

referrer는 `ownerKind`, `ownerId`, canonical path의 ASCII 순서다. test는 전체 문장보다 kind/id와 정렬된 referrer suffix를 검사한다.

### reference edge와 path 규칙

`src/core/resourceReferences.js`가 다음 frozen 값을 소유한다.

```ts
type ResourceKind = "data" | "scale" | "coordinate" | "mark" | "selection";
type ResourceReference = {
  kind: ResourceKind;
  id: string;
  ownerKind: string;
  ownerId: string;
  path: readonly (string | number)[];
  strength: "live" | "context";
};
```

`path`는 owner-relative known-schema path다. 예:

- layer data: ownerKind `layer`, ownerId `points`, path `["data"]`
- Parallel scale: `["encoding","parallel","dimensions",0,"scale"]`
- legend scale: ownerKind `legend`, ownerId `categorical`, path `["scales",0]`
- facet source: ownerKind `composition`, ownerId facet ID, path `["facet","data"]`
- current pointer: ownerKind `context`, ownerId `program`, path `["currentData"]`, strength context

`canonicalResourcePath`는 identifier key는 `.key`, numeric index는 `[n]`로 format한다. 반환 배열, 각 edge, path는 freeze한다. 동일 edge는 kind/id/ownerKind/ownerId/path/strength exact key로 deduplicate한다.

### collector가 반드시 순회할 schema

central collector는 아래 closed functions로 나눈다. 함수 이름은 고정하되 한 파일 안의 private 함수로 시작해도 된다.

```text
collectSemanticDataReferences
collectSemanticScaleReferences
collectSemanticCoordinateReferences
collectMarkConfigReferences
collectGuideConfigReferences
collectSelectionReferences
collectDataOwnerReferences
collectCompositionReferences
collectContextReferences
```

#### data

- every `semanticSpec.layers[i].data`
- every derived dataset `semanticSpec.datasets[i].source`
- `materializationConfigs.data[family][owner].current/source/previous` 중 실제 replay/live field
- box/error/gradient/regression/violin/ecdf/interval/endpoint/raincloud/statistical-reference mark config의 data/source/profile/current IDs
- facet parent `compositionSpec.facet.data`, current grid/repeat retained source, child provenance link
- dynamic statistical population의 stored data ID

trace args와 이전 program object는 제외한다. `materializationConfigs` 안에 현재 replay에 쓰는 template/program이 있으면 live이고 그 nested namespace는 별도 program으로 순회한다.

#### scale

- every ordinary `layer.encoding[channel].scale` for current scaled channel vocabulary
- `layer.encoding.parallel.dimensions[i].scale`
- semantic axis/grid `scale`, Parallel axis `scales[]`
- guide config의 `scale`, `scales[]`, legend binding/sampling/block recipe가 실제 ID를 저장하는 path
- dynamic reference axis binding과 mark config의 named scale field
- facet scale binding/provenance가 실제 scale ID를 저장하는 경우

resolved domain/range/sample numeric arrays는 참조가 아니다. 문자열 token 값이 scale ID와 같아도 edge가 아니다.

#### coordinate

- `layer.coordinate`
- semantic axis/grid coordinate binding
- Parallel axis config와 Polar guide placement가 실제 coordinate ID를 저장하는 path
- annotation/statistical reference의 data-space coordinate
- facet/repeat retained/local coordinate recipe의 명시 ID

graphic parent ID나 translated numeric center/radius는 coordinate reference가 아니다.

#### mark와 selection

- attached label `source`, statistical reference `source`, owned-child relation
- selection config `target`
- highlight config `selection`과 `target`
- named label selection ID

R25 public API는 mark/selection removal을 추가하지 않는다. 이 edge는 기존 `removeMark`, `removeMarkLabels`, `removeMarkSelection`, derived release preflight가 같은 registry를 재사용하기 위해 필요하다.

### ownership 판정

`resolveResourceOwnership(program,{kind,id})`는 이름 prefix를 보지 않는다.

1. semantic array의 exact ID 또는 data logical owner exact ID를 찾는다.
2. 현재 mark/data/facet config에 명시된 owner relation을 수집한다.
3. live owner가 있는 generated resource는 `chart-owned`다. 사용자는 owner action을 호출해야 한다.
4. standalone data owner는 `standalone`이다. 외부 live edge가 없으면 logical owner와 current snapshot을 같이 지울 수 있다.
5. 명시 owner metadata가 없고 exact semantic entry가 있으면 user-addressable named resource다.

구조적 owner metadata가 없는 오래된 program에서 이름 모양만 보고 internal로 판정하지 않는다. 반대로 owner config가 남아 있는데 현재 direct layer edge가 없다는 이유로 user resource로 낮추지 않는다.

### preflight와 commit algorithm

`src/actions/resources/remove.js`에 공통 `planResourceRemoval`과 세 wrapped action을 둔다. `src/actions/resources/index.js`가 Full registrar만 제공한다.

```text
validate options/id
resolve exact resource and ownership
collect and sort all references
remove allowed self-edge
reject any live edge
build immutable removal plan
apply semantic/cache/config/context cleanup
assert visible graphic/children unchanged
return new program
```

세부 규칙:

1. wrong kind는 unknown과 구별한다. 예를 들어 dataset ID를 `removeScale`에 주면 `Resource "D" exists as data, not scale.` 오류다.
2. standalone `removeData({id: logicalOwner})`만 `dataOwner.current` 자기 edge를 제외한다. current snapshot에 다른 layer/dataset/config edge가 있으면 거부한다.
3. live edge가 하나라도 있으면 semantic/config/resolved/context/trace에 write하지 않는다.
4. data 성공은 semantic dataset entry를 제거한다. standalone은 owner config와 current snapshot을 함께 제거하고 upstream source는 보존한다.
5. scale 성공은 semantic scale과 같은 ID의 `resolvedScales` cache를 제거한다. unrelated guide/mark config는 건드리지 않는다.
6. coordinate 성공은 semantic coordinate만 제거한다. concrete mark/guide/layout은 live edge가 0이므로 이미 target을 사용하지 않아야 한다.
7. context-only edge는 삭제를 막지 않는다. 성공 commit에서 해당 current pointer를 `undefined`로 하고 다른 resource를 자동 선택하지 않는다.
8. graphicSpec과 composition children은 reference-identical이어야 한다. materialization을 호출하지 않는다.
9. public domain action trace 아래에는 필요한 semantic/config primitive child만 남긴다. 실패는 새 trace node를 caller-visible state에 남기지 않는다.

composition parent에서 top-level semantic array를 갱신할 때 public `editSemantic`의 composition 제한을 우회하는 임의 `_clone`을 action 본문에 흩뿌리지 않는다. `src/core/programState.js`에 pure `removeNamedSemanticResourceState` 하나를 두고 unit/composition 모두 같은 array/cache/context cleanup을 사용한다. 이 helper는 trace를 만들지 않고 public export하지 않는다.

### 기존 lifecycle과 연결

- `releaseDerivedData`는 layer/dataset 두 곳만 보는 현재 shortcut을 버리고 data live edges를 사용한다. 참조가 있으면 현재 idempotent no-op behavior를 보존하고, 참조가 없을 때만 제거한다.
- `removeMark`는 owner closure를 먼저 계산하고 그 closure 내부 edge를 제외한 외부 refs를 preflight한다. 기존 복합 owner 삭제를 cascade public resource deletion으로 바꾸지 않는다.
- `removeMarkSelection`과 `removeMarkLabels`는 named label/highlight edge를 registry에서 읽되 현재 오류 의미를 보존한다.
- R02 standalone revision release는 새 current를 모든 consumer에 bind한 뒤 old snapshot edges를 다시 수집해 0일 때만 제거한다.

### W11 tests

| 파일 | 반드시 소유할 검증 |
| --- | --- |
| `test/unit/core/resource-references.test.js` | 모든 known path, dedup, sort, freeze, namespace, no false positive |
| `test/unit/actions/resources/remove.test.js` | 세 action 정상/오류/context/standalone commit |
| `test/contracts/remove-resources.test.js` | R25-N01..L01, owner actions, composition retained source, pixel invariant |
| `test/contracts/remove-resource-types.test.js` | Full positive, Basic/invalid options negative |
| `test/contracts/package-boundaries.test.js` | runtime/type/export/Basic absence/packed contents |

각 live path는 다른 edge를 모두 제거한 one-edge fixture로 검증한다. 최소 fixture는 다음과 같다.

1. unused D/S/C 삭제: semantic count 각각 1 감소, graphics와 decoded PNG hash 동일.
2. currentData/currentScale/currentCoordinate만 target: 삭제 성공, pointer 없음.
3. trace args에만 ID: 삭제 성공.
4. direct layer data, child dataset source, retained facet source, dynamic population 각각 data 삭제 거부.
5. xOffset, stroke legend, Parallel dimension 각각 scale 삭제 거부. E01은 Parallel path를 literal로 검사.
6. Polar axis와 annotation 각각 coordinate 삭제 거부.
7. token/color/text가 우연히 ID와 같아도 edge 0.
8. insertion order를 반대로 만든 두 program의 referrer error suffix 동일.
9. 마지막 mark/label/selection owner 제거 뒤 standalone logical data 삭제 성공, upstream source 유지.
10. unknown/wrong kind/chart-owned internal/error 모두 program 8개 branch, `_actionSequence`, caller options 불변.

Phase 11 종료 시 세 action은 ACTION_INDEX의 Current owner 하나, Full runtime/types, current CORE contract, removal intent/card/relation/MCP/docs와 installed package evidence를 가져야 한다. Basic method surface는 그대로다.

## 7. Phase 12 — 전체 통합과 main merge 전 closeout

Phase 12는 새 제품 API를 만드는 단계가 아니다. 누락을 발견하면 해당 feature owner로 돌아가 제품 checkpoint를 따로 만들고 검증한 뒤 다시 closeout한다.

### W12.1 machine reconciliation

다음 대조를 script 또는 일회성 Node 명령으로 실행하고 결과를 STEP 원장에 기록한다.

1. `PROPOSALS.json` selected IDs, `IMPLEMENTATION_MAP.json.features[].id`, feature filenames, `TRACEABILITY.md` rows가 정확히 같은 25개 set인지 확인한다.
2. 각 feature status가 Implemented-primary 이상이고 implementationCommit이 실제 ancestor commit인지 확인한다.
3. `ACCEPTANCE_CASES.json` 모든 case가 `passed`, non-null runtimeEvidence, 실제 존재하는 stable test path를 가지는지 확인한다.
4. 새 direct action마다 ACTION_INDEX implemented entry 정확히 하나, current contract anchor, Full runtime method, declaration method, action card, relationship, intent provider, public docs route가 있는지 확인한다.
5. 계획/roadmap 파일을 src 또는 stable product test가 import하지 않는지 `rg`로 확인한다.
6. `Current`, `Planned`, `Proposed`, `partial`, `pending` 상태를 owner별로 검사하고 required integration cell에 partial/pending이 하나라도 있으면 closeout을 멈춘다.

### W12.2 네 개의 누적 프로그램

`test/contracts/roadmap-authoring-integration.test.js` 같은 roadmap 이름을 쓰지 않는다. stable capability 이름인 `test/contracts/advanced-authoring-integration.test.js`에 다음 네 test를 둔다.

1. **data provenance**: complete → impute → computed → normalize → duration window → weighted summary → R02 source revision. 각 derived owner/current ID, row order, literal values, old snapshot release를 검사한다.
2. **appearance authoring**: atomic x/y/color/stroke/size → combined legend exact values/block labelMap → selected semantic labels → dynamic reference → custom theme → R49 style. explicit style precedence와 removeTheme 복원을 검사한다.
3. **Polar composition**: R27 aspect + R29 frame → Polar facet/grid → source edit → shared/independent edit → theme → Canvas resize. requested frame과 local effective radius, headers, label/highlight를 검사한다.
4. **Parallel cleanup**: dimension scale edit → parallelDimension repeat → facet shared domains → labels/guides → owner teardown → unused resource removal. dimension별 domain과 sibling preservation을 검사한다.

각 test는 before program, caller inputs, deterministic action op sequence, semantic IDs, resolved numeric values, concrete graphic properties를 literal로 검사한다. 같은 four programs를 packed consumer에서 축약 실행하되 계획 문서를 import하지 않는다.

### W12.3 생성과 검증의 정확한 순서

owner source와 hand-written docs를 먼저 수정한 뒤 다음을 실행한다.

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
npm run docs:capabilities:check
npm run docs:reference:check
npm run docs:actions:check
npm run docs:signatures:check
npm run docs:metadata:check
npm run docs:search:check
npm run docs:machine:check
npm run examples:index:check
npm run test:docs
npm run package:check
npm run package:pack
npm run test:package -- /absolute/path/to/packed.tgz
npm run package:bundle
npm test
git diff --check
```

`docs:preflight`가 성공할 때만 Jekyll build/browser 검증을 추가한다. 환경 실패를 passed로 적지 않는다. 이미 같은 head에서 통과했고 관련 input이 변하지 않은 check만 재사용할 수 있다.

package 기록은 tarball absolute path, SHA-256, entry count, packed/unpacked bytes, Full/Basic/SVG gzip, Node/TypeScript/MCP/browser consumer 결과를 포함한다. 임시 repack의 hash를 registry artifact evidence라고 부르지 않는다.

### W12.4 문서와 상태 closeout 순서

1. current contracts와 ACTION_INDEX coverage/evidence를 제품 head에 맞춘다.
2. public docs와 generated artifacts를 맞춘다.
3. feature files, PROPOSALS, IMPLEMENTATION_MAP, ACCEPTANCE_CASES, TRACEABILITY, STATE_AND_REPLAY를 실제 revision과 evidence로 갱신한다.
4. Phase 9–12 STEP/GOAL/CANDIDATES를 실제 상태로 닫고 ROADMAP과 ROADMAP_INDEX를 completed로 갱신한다.
5. `SECOND_ARCHITECTURE.md`는 R43이 composition materialization/state boundary를 바꾸거나 R25가 cross-domain resource registry를 도입한 실제 결과를 현재 구조로 기록한다. exact option 표를 복사하지 않는다.
6. closeout diff 자체의 navigation/contracts/docs/package freshness를 다시 검사하고 commit/push한다.

상태 문서를 제품보다 먼저 Current로 바꾸지 않는다. implementationCommit은 실제 제품 commit을, closeout STEP은 실제 검증 head를 가리킨다.

### W12.5 main 반영과 issue closeout

사용자의 기존 요청은 Roadmap 7 구현을 main에 반영하고 관련 issue를 닫는 범위를 포함한다. 최종 verified head가 origin/main의 descendant인지 확인하고, 원격 main이 새 commit을 가리키면 검증을 무효화하지 말고 fetch 후 영향 범위를 다시 확인한다. fast-forward 가능한 동일 head를 main에 push하고 remote SHA를 읽어 확인한다.

Roadmap 7 issue는 각 issue가 요구한 feature/case와 merge revision을 comment에 연결한 뒤 close한다. package publish와 docs deploy는 별도 명시 요청이 없으므로 실행하지 않는다.

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
