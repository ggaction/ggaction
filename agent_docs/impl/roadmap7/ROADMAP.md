# Roadmap 7 — 차트 저작 연산의 세부 완성

문서 상태 — 현재 실행 계획.

사용자가 감사 50개 항목 중 선택한 **25개**를 구현할 다음 로드맵이다. 현재 단계는 **Phase 0 / planned**이며 이번 변경에서는 문서만 작성한다. 신규 API와 수치 정책은 **Proposed**다. 제품 구현이나 세부 승인 완료를 의미하지 않는다. 탐색 상태는 [ROADMAP_INDEX.json](../ROADMAP_INDEX.json)이 관리하며, 마지막 완료 실행 기록은 Roadmap 6 Phase 11이다.

## 의도와 성공 기준

하이레벨 chart 정의부터 데이터·encoding·좌표·guide·label·스타일까지 각 저작 층위에서 사용자가 할 만한 연산을 직접 표현한다. chart facade와 하위 편집 경로를 함께 완성하며, 일반 사용자는 domain action으로 저작한다. 핵심은 **create → edit → reencode → source/Canvas replay → remove** 전 과정에서 의미와 소유권을 유지하는 것이다.

완료 조건은 25개 기능의 동작·오류·수치·불변성·composition·renderer·types·installed package·knowledge/docs를 함께 완성하는 것이다. 함수가 존재하거나 첫 PNG가 출력되는 것만으로 완료하지 않는다. 각 Phase는 검증 가능한 결과물 단위로 운영한다.

## 먼저 읽을 순서

1. [IMPLEMENTER_START_HERE.md](IMPLEMENTER_START_HERE.md) — 구현자 인계·작업 순서.
2. [COMMON_CONTRACT.md](COMMON_CONTRACT.md) — 공통 불변조건 12개.
3. [API_DETAILS.md](API_DETAILS.md) — 실제 current 타입 연결과 빠뜨리면 안 되는 옵션 의미.
4. [DECISIONS.md](DECISIONS.md) — 권장안 26개와 gate별 concrete 설계 검증.
5. [STATE_AND_REPLAY.md](STATE_AND_REPLAY.md) — 데이터 revision·소유권·재실행·참조.
6. [IMPLEMENTATION_EXAMPLES.md](IMPLEMENTATION_EXAMPLES.md) — 구체적인 호출과 독립 기대 결과.
7. 아래 해당 feature와 Phase 문서, [VALIDATION.md](VALIDATION.md).

## 정확한 선택 범위

`2, 5, 6, 7, 8, 9, 10, 19, 20, 21, 22, 23, 25, 27, 29, 31, 32, 33, 36, 37, 38, 39, 43, 47, 49`

번호는 직전 감사 보고서의 번호를 보존한다. 새 문서의 순번으로 재해석하지 않는다. 특히 **이번 R20은 Parallel scale 편집**이며, 예전 Roadmap 6에서 제외한 **F20 특수차트군**과 다르다. 이번 R20은 포함하고 과거 F20 제외는 유지한다.

| 감사 번호 | 상세 구현 명세 | Primary Phase | 기능 선행 |
| --- | --- | --- | --- |
| 2 | [R02 파생 데이터 정의 편집과 종속 갱신](features/02-derived-editing.md) | 4 | R05, R06, R07, R08, R09, R10 |
| 5 | [R05 결측 조합 완성과 대체](features/05-complete-impute.md) | 2 | 공통 계약 |
| 6 | [R06 조건·문자열·null 계산식](features/06-computed-expressions.md) | 1 | 공통 계약 |
| 7 | [R07 그룹 정규화·기준값 비교](features/07-normalization.md) | 1 | R06 |
| 8 | [R08 주간·요일·시간대 버킷](features/08-calendar-buckets.md) | 2 | 공통 계약 |
| 9 | [R09 기간 기반 window와 최소 관측수](features/09-duration-windows.md) | 2 | R08 |
| 10 | [R10 가중 통계·histogram·KDE](features/10-weighted-statistics.md) | 3 | 공통 계약 |
| 19 | [R19 다중 채널의 원자적 재인코딩](features/19-atomic-encoding.md) | 5 | R20, R21, R22, R23 |
| 20 | [R20 Parallel 차원별 scale 집중 편집](features/20-parallel-scale.md) | 5 | 공통 계약 |
| 21 | [R21 중첩 band offset scale 집중 편집](features/21-offset-scales.md) | 5 | 공통 계약 |
| 22 | [R22 필드 기반 stroke 색상](features/22-stroke-color.md) | 5 | 공통 계약 |
| 23 | [R23 크기 scale의 비선형·단계형 mapping](features/23-size-scale-types.md) | 5 | 공통 계약 |
| 25 | [R25 미사용 dataset·scale·coordinate 안전 삭제](features/25-remove-resources.md) | 11 | R02, R19, R20, R21, R22, R27, R29, R31, R32, R36, R37, R38, R39, R43, R47, R49 |
| 27 | [R27 좌표 frame 종횡비와 데이터 단위비](features/27-coordinate-aspect.md) | 6 | 공통 계약 |
| 29 | [R29 Polar 중심과 frame 반지름·배치](features/29-polar-frame.md) | 6 | R27 |
| 31 | [R31 원본 마크를 보존하는 붙임 라벨 삭제](features/31-remove-labels.md) | 7 | 공통 계약 |
| 32 | [R32 선택된 final item만 라벨링](features/32-selected-labels.md) | 7 | R31 |
| 33 | [R33 의미 기반 라벨 anchor와 배치 정책](features/33-semantic-label-anchors.md) | 7 | R27, R29, R32 |
| 36 | [R36 데이터를 추적하는 통계 참조선·밴드](features/36-statistical-references.md) | 7 | R02, R19 |
| 37 | [R37 연속 범례의 명시적인 표본값](features/37-legend-values.md) | 8 | R22, R23 |
| 38 | [R38 결합 범례의 channel block별 편집](features/38-legend-blocks.md) | 8 | R37 |
| 39 | [R39 범주 표시명과 facet header 배치](features/39-display-names-headers.md) | 8 | R38 |
| 43 | [R43 Polar·Parallel facet와 repeat 지원](features/43-polar-parallel-facets.md) | 10 | R02, R20, R22, R27, R29, R32, R33, R37, R38, R39, R47, R49 |
| 47 | [R47 사용자 theme tokens와 composition 전파](features/47-custom-theme.md) | 9 | 공통 계약 |
| 49 | [R49 둥근 모서리와 stroke cap·join](features/49-shape-style-details.md) | 9 | 공통 계약 |

모든 항목의 단일 machine owner는 [PROPOSALS.json](PROPOSALS.json)이다. Phase별 CANDIDATES는 후보 상태와 소유 위치를 참조한다. [TRACEABILITY.md](TRACEABILITY.md)는 기능과 인수 증거를 연결한다.

## 이번에 추가하지 않는 범위

감사 번호 `1, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 24, 26, 28, 30, 34, 35, 40, 41, 42, 44, 45, 46, 48, 50`은 선택되지 않았다. 예: replaceData, 범용 Join, Pivot, 일반 layer order, compound selectors, transpose, viewport, 복수 axes, 일반 text template, facet 정의 편집, 2차원 repeat, cell override, 임의 concat scale sharing, responsive sizing, style reset, export preset.

선택 기능에 필요한 작은 내부 helper는 허용하지만, 선택하지 않은 public API를 dependency로 추가하지 않는다. 정규화는 내부 group summary로 구현한다. theme는 style reset을 포함하지 않는다. R43은 현재 facet/repeat의 family 확장이며 R40/41/42/44를 추가하지 않는다.

## 실행 순서와 phase 상태

Phase 번호는 권장 구현 순서다. 같은 Phase 안에서도 feature의 dependsOn을 지킨다. Phase 0 에서 계획을 검토하고, 이후 각 Phase는 A(계약), 필요한 V(primitive 시각 목표), X(검증·완료)를 갖는다. Gate는 아직 모두 planned다.

| Phase | status | 목표 | 감사 항목 | 선행 Phase |
| --- | --- | --- | --- | --- |
| 0 | planned | 선택 범위·계약·baseline 고정 | 전체 계획 | — |
| 1 | planned | 계산식과 그룹 정규화 | 6, 7 | 0 |
| 2 | planned | 결측·지역 달력·기간 window | 5, 8, 9 | 1 |
| 3 | planned | 가중 집계와 밀도 | 10 | 2 |
| 4 | planned | 파생 데이터 편집 | 2 | 1, 2, 3 |
| 5 | planned | 스케일·stroke·원자적 인코딩 | 20, 21, 23, 22, 19 | 4 |
| 6 | planned | 좌표 비율과 Polar frame | 27, 29 | 5 |
| 7 | planned | 라벨 lifecycle와 통계 주석 | 31, 32, 33, 36 | 4, 5, 6 |
| 8 | planned | 범례 content와 표시명 | 37, 38, 39 | 5, 7 |
| 9 | planned | 사용자 theme와 형상 스타일 | 47, 49 | 7, 8 |
| 10 | planned | Polar·Parallel facet와 repeat | 43 | 4, 5, 6, 7, 8, 9 |
| 11 | planned | 미사용 자원 삭제 | 25 | 10 |
| 12 | planned | 25개 항목 통합·계약·패키지 마감 | 전체 통합 | 11 |

큰 위험은 앞에서 수치와 계약으로 정리하고, 다른 기능을 소비하는 작업은 뒤에 둔다. 데이터 편집은 새 transforms 이후, atomic encoding은 focused scales·stroke·size 이후, Polar/Parallel facets는 좌표·guide·labels·theme 이후, 자원 삭제는 모든 새 참조 schema 이후에 구현한다.

## Phase 0 — 선택 범위·계약·baseline 고정

[목표](phase0/GOAL.md) · [실행 체크리스트](phase0/STEP1.md) · [Gates](phase0/GATES.md)

- 현재 commit/method inventory/기존 probe snapshot을 재확인하고 이번25개와 제외25개의 경계를 고정한다.
- 공통 계약, API_DETAILS와 DECISIONS의 proposed 이름/수식/ownership을 실제 schema diff로 검토한다.
- 모든 phase별 capability owner·required matrix·기계 inventory를 확인한다. 구현 stub을 만들지 않는다.
- 검증된 계획 전체를 commit/push하고 A gate의 정확한 승인 범위를 기록한다.

## Phase 1 — 계산식과 그룹 정규화

[목표](phase1/GOAL.md) · [실행 체크리스트](phase1/STEP1.md) · [Gates](phase1/GATES.md)

- W1: computed AST 구조 validator와 nullable/string/boolean evaluator를 분리해 확장한다.
- W2: grouped normalization pure algorithm과 transform topology를 추가한다.
- W3: create API/type/trace/facet replay/knowledge와 independent oracle를 완성한다.

## Phase 2 — 결측·지역 달력·기간 window

[목표](phase2/GOAL.md) · [실행 체크리스트](phase2/STEP1.md) · [Gates](phase2/GATES.md)

- W1: complete typed key domain/group tuples/provenance와 impute interpolation·edge/missing 정책.
- W2: timezone boundary numerical prototype와 UTC legacy oracle를 먼저 확정한다.
- W3: week/weekday/timeZone parsing-independent bucket을 구현한다.
- W4: duration movingMean/Sum, temporalUnit/minPeriods/missing과 stable two-pointer window.
- W5: complete → impute → window 및 facet-local replay 통합.

## Phase 3 — 가중 집계와 밀도

[목표](phase3/GOAL.md) · [실행 체크리스트](phase3/STEP1.md) · [Gates](phase3/GATES.md)

- W1: frequency/reliability accumulators와quantile/variance/nEff 오라클.
- W2: summary/bin/KDE requested weight와explicit/auto bandwidth 처리.
- W3: histogram/density/violin facade pass-through와group/facet별 기여도.
- W4: unweighted compatibility와installed browser/Node 통계 검증.

## Phase 4 — 파생 데이터 편집

[목표](phase4/GOAL.md) · [실행 체크리스트](phase4/STEP1.md) · [Gates](phase4/GATES.md)

- W1: 기존 Bin2D revision/interval edit ownership 회귀를 먼저 고정한다.
- W2: logical owner/current, target resolution, requested extractor, downstream DAG preflight.
- W3: default reject와explicit recompute revision transaction, output role migration.
- W4: standalone public create16개 family의 focused edit/type/trace를 빠짐없이 연결한다.
- W5: marks/scales/guides/current selections/facet source replay까지 검증하고 future labels/reference hooks를 명시한다.

## Phase 5 — 스케일·stroke·원자적 인코딩

[목표](phase5/GOAL.md) · [실행 체크리스트](phase5/STEP1.md) · [Gates](phase5/GATES.md)

- W1: editParallelScale/offset scale을 existing editScale의focused resolver로 연결.
- W2: size continuous/discrete mapper와area-correct mark/legend geometry.
- W3: field stroke+scale+legend channel과series grain validator.
- W4: encodeChannels final-state plan과all-consumer preflight.
- W5: 단일 encode 동등성, 중간-invalid final-valid, combined legend와shared scale 통합.

## Phase 6 — 좌표 비율과 Polar frame

[목표](phase6/GOAL.md) · [실행 체크리스트](phase6/STEP1.md) · [Gates](phase6/GATES.md)

- W1: allocated/effective bounds를 구별하는 aspect pure function.
- W2: domain → aspect → range dependency와Cartesian data-unit ratio.
- W3: polar center/radius resolver를 모든 mark/guide 호출에 전달.
- W4: Canvas/domain/layout 변경 후 radius/aspect 유지와atomic overflow error.

## Phase 7 — 라벨 lifecycle와 통계 주석

[목표](phase7/GOAL.md) · [실행 체크리스트](phase7/STEP1.md) · [Gates](phase7/GATES.md)

- W1: attached label-only removal closure와replay cleanup.
- W2: source-final-item label selection, inline/named recipe와predicate stage.
- W3: signed/stack/arc semantic anchors, fit fallback와leader ownership.
- W4: boundData/visibleItems dynamic references와domain-contribution 차단.
- W5: data edit → selection → labels/reference → layout → highlight 전체와삭제 순서 통합.

## Phase 8 — 범례 content와 표시명

[목표](phase8/GOAL.md) · [실행 체크리스트](phase8/STEP1.md) · [Gates](phase8/GATES.md)

- W1: exact size/opacity/width legend samples와invalid-after-scale-edit preflight.
- W2: combined block canonical identity/override/transition semantics.
- W3: typed display mapping과role별facet header side/align/occupied bounds.
- W4: theme/source/Canvas/reorder/remove replay에서content와style 보존.

## Phase 9 — 사용자 theme와 형상 스타일

[목표](phase9/GOAL.md) · [실행 체크리스트](phase9/STEP1.md) · [Gates](phase9/GATES.md)

- W1: custom tokens closed schema와explicit style precedence.
- W2: nested composition descendants propagation와retained source theme recipe.
- W3: rounded rect common path 및cap/join/miter bounds primitive 먼저 구현.
- W4: 기존 mark create/edit/legend/highlight/renderers에 동일 attrs 전달.
- W5: reencode/theme/Canvas/facet-style persistence 및renderer matrix.

## Phase 10 — Polar·Parallel facet와 repeat

[목표](phase10/GOAL.md) · [실행 체크리스트](phase10/STEP1.md) · [Gates](phase10/GATES.md)

- W1: chart 지원행렬 각 family primitive/public target fixture와local-frame oracle.
- W2: source partition/provenance replay 및nested parallel/polar refs.
- W3: dimension별shared/independent domains와pie-local shares.
- W4: one-dimensional theta/r/parallelDimension repeat field substitution.
- W5: local guides/shared compatible legends/header/labels/theme/styles의namespace/replay.
- W6: 모든 matrix와Cartesian facet/repeat 기존 지원 회귀.

## Phase 11 — 미사용 자원 삭제

[목표](phase11/GOAL.md) · [실행 체크리스트](phase11/STEP1.md) · [Gates](phase11/GATES.md)

- W1: 모든 새 config/semantic/template의live ref path inventory.
- W2: data/scale/coordinate ref collector와context-only/trace-only 구별.
- W3: removeData/removeScale/removeCoordinate reject-only mutations.
- W4: R02 revision release와owner removal 공유 helper regression.
- W5: 숨은 consumer path별 단일-reference fixture와pixel-invariant unused deletion.

## Phase 12 — 25개 항목 통합·계약·패키지 마감

[목표](phase12/GOAL.md) · [실행 체크리스트](phase12/STEP1.md) · [Gates](phase12/GATES.md)

- W1: 선택 25개↔current capability↔API↔tests↔docs↔package evidence 전수 대조.
- W2: STATE_AND_REPLAY의4개 복합 흐름과R43 future cells 모두 검증.
- W3: 전체tests/renderers/browser/realistic/docs build/type/installed package matrix.
- W4: 미지원/미완료 entries를 사용자 승인 없이삭제하거나완료로표시하지 않는다.
- W5: 현재 architecture/contracts와generated metadata, roadmap pointer를실제완료상태로닫는다. release/PR/publish/deploy는별도요청 범위.

## baseline과 문서 검증

- 코드 기준: `c0e47da6e213852213bcb04eb19031a1a6a63cd7`, package 0.0.13.
- 기존 감사: direct methods 244, user-facing 238. probe 20개는 미지원 경계 15개와 지원 대조군 5개를 확인한 기록이며 버그 총수가 아니다.
- [audit/BASELINE.md](audit/BASELINE.md)와 보존된 관측 JSON을 참고한다. 실제 동작의 최종 권위는 현재 source/declarations/executable tests다.
- 문서 작성 검증은 [PLAN_VALIDATION.md](PLAN_VALIDATION.md). 향후 구현 테스트와 분리한다.

## 변경·완료 규칙

각 coherent change마다 검증·commit·push한다. Planned/Current inventory는 승인되거나 구현된 부분만 승격한다. 모든 25개와 필수 통합 cells가 닫히기 전에는 Roadmap 완료로 표시하지 않는다. PR 생성·메인 머지·패키지 publish·docs 배포는 이번 문서 작성 요청에 포함하지 않는다. 이후 구현은 사용자 승인 범위에 따라 실행한다.
