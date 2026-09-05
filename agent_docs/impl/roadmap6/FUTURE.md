# Roadmap 6 — F20 장기 후보와 다음 진입 조건

F20은 목록에서 빠진 차트군을 기억하기 위한 범위다. 이번 로드맵에서 모두 구현한다는 약속이 아니다.
후보마다 data grain·수학·layout·consumer 요구가 달라 하나의 “새 차트 wrapper” 작업으로 묶지 않는다.
현재 모든 후보는 Proposed이며 승인된 Maybe Future 또는 Planned로 자동 승격하지 않았다.

## 후보별 판단

| 후보 | 기존 기반 | 추가로 필요한 의미·owner | 권장 순서·규모 | 진입 조건 |
| --- | --- | --- | --- | --- |
| Waterfall | Window cumulative, range bar/rule, labels | delta/subtotal/total 역할, reset, connector, signed cumulative baseline | F20 중 먼저 검토, M | 실제 subtotal/reset 데이터와 원하는 final chain |
| Range / timeline | temporal position, rect/rule, category band | start/end·open interval, lane/overlap, duration/time unit | 먼저 검토, M/L | timezone·open-ended·overlapping event 정책 |
| OHLC / candlestick | rule+bar composite, temporal scale | open/high/low/close 역할, invariants, up/down/flat 의미, session/gap | 먼저 검토, M | OHLC sample, time/session과 missing bar 정책 |
| Hierarchy: treemap | rect/text, summary | parent-child key, cycle/orphan/duplicate 검증, leaf/internal total, area layout | 별도 기능 설계, L | hierarchical dataset, aggregation convention, stable layout |
| Hierarchy: sunburst | arc/theta/radius | parent angular partition, depth/radius bands, hierarchy provenance | treemap과 의미 공유 가능, L | hierarchy 계약과 radial depth/readability 요구 |
| Flow: Sankey / alluvial | path/ribbon geometry | node/link grain, conservation, ordering, crossing/layout, links identity | 별도 layout 연구, L | source/target/weight data와 feedback/cycle 처리 |
| Network | point/path/text | node/edge identity, directed/undirected, layout constraints, stable positions | 별도 layout 연구, L | deterministic layout 또는 explicit node positions |
| Geographic | line/path/point | feature topology, projection, CRS/units, antimeridian/clipping, join provenance | 별도 좌표·package 설계, L | geographic dataset, projection·boundary·bundle 요구 |

M/L은 변경 구조의 비교다. 일정·비용 추정이 아니다. 같은 hierarchy나 flow 이름 아래서도 위 표의 서로 다른
geometry와 data grain을 독립 검증한다.

## F20-A Waterfall

권장 API 개념은 category, delta/value, role(delta/subtotal/total), optional reset/connector를 명시하는 complete facade다.
단순 cumulative sum은 기존 Window owner를 재사용한다. Total row를 일반 delta처럼 더하거나 처음 값을 자동
baseline으로 삼지 않는다. Source/role edit는 그 뒤 누적 endpoints와 labels를 함께 재생성해야 한다.

수용 oracle: 각 step end = previous end + delta, subtotal/total/reset의 별도 기대값,
negative/zero/missing·endpoint connector, category order 변경 시의 명시적 재계산.
H2의 cumulative/range data와 H3의 connector/total style 경로가 없으면 H0만 완료라고 하지 않는다.

## F20-B Range / timeline

Data의 start/end와 visualization slot을 구분한다. Missing end가 ongoing인지 invalid인지,
duration이 elapsed milliseconds인지 calendar duration인지, overlap을 허용/stack/pack할지 결정한다.
Timezone과 daylight saving을 locale 추론으로 해결하지 않는다.

수용 oracle: temporal endpoint mapping, duration, interval ordering, open-ended extent policy,
lane overlap·filter/source edit·labels/axis formatting. “Gantt”를 별도 이름으로 추가할 경우 dependency/progress
의미가 필요한지 분리한다. 단순 range chart에 task scheduling 기능을 몰래 넣지 않는다.

## F20-C OHLC / candlestick

한 period의 open/high/low/close를 같은 final row로 묶는다. High≥max(open,close), low≤min(open,close)의
validation, equal open/close, market gap과 duplicate period를 처리한다.
Green/red 등 색상은 명시적 up/down theme token이며 financial 의미를 raw color로만 저장하지 않는다.

수용 oracle: four-price endpoint와 wick/body geometry, constant body minimum 표시가 데이터 의미를 바꾸지 않음,
session/period ordering, source edit 뒤 stable period identity. 새 금융 데이터 connector는 이 범위에 필요하지 않다.

## F20-D Hierarchy

Tree/forest key, parent reference, cycles, orphan, duplicate ID, negative weight,
internal node total이 명시값인지 child sum인지부터 확정한다.
그 뒤 treemap의 area tiling과 sunburst의 nested angular partition을 별도 layout으로 설계한다.
원본 tree와 final item의 provenance를 selection/labels에서 조회할 수 있어야 한다.

수용 oracle: subtree totals, nonoverlap/containment, area 또는 angular proportionality,
stable IDs, source revision/removal, renderer clipping. 계층 data owner가 승인되기 전 generic createHierarchyChart
같은 넓은 facade부터 만들지 않는다.

## F20-E Flow와 network

Sankey/alluvial은 weighted flow와 node/link conservation이 중요하고, 일반 network는 그런 제약이 없을 수 있다.
Directedness, cycles, self-loops, multi-edges, edge routing과 node order를 명시한다.
Data relationship과 concrete layout을 분리하며, 자동 simulation을 renderer에 넣지 않는다.

수용 oracle: flow conservation 또는 명시적 imbalance, edge identity/width, node bounds,
determinism/iteration cap/overflow, source edit와 selected node/edge rematerialization.
처음에는 explicit positions/ordering 같은 작은 경로가 자동 최적화보다 적절한지 검토한다.

## F20-F Geographic

Geometry feature와 ordinary tabular measures의 join grain을 먼저 결정한다.
CRS, projection parameters, longitude wrapping, antimeridian, holes/multipolygons, clipping과 missing joins를
명시한다. Projected point와 geographic distance/area의 의미를 혼동하지 않는다.

수용 oracle: known projection coordinates, topology preservation, clipping/holes, join identity,
Canvas/SVG/PNG/PDF, package/browser weight. Projection dependency와 large geometry data 배포는
별도의 package 결정 대상이다.

## 다음 로드맵으로 올리는 공통 조건

1. 실제 사용 요청과 representative dataset이 있다.
2. H0 final call과 H1/H2 reusable meaning, H3 editing needs를 같이 설명할 수 있다.
3. 기존 owner 재사용과 새 owner가 필요한 지점을 구분했다.
4. Input/output grain, inference/default, units, errors, immutable edit contract를 고정했다.
5. Primitive visual target과 independent numeric oracle를 만들 수 있다.
6. Encodings/guides/selection/labels/rematerialization/renderers/types/package/docs의 consumer matrix가 있다.
7. 구현량과 우선순위를 기존 hierarchy 공백 보강과 비교해 선택했다.

## 처분 기록 규칙

Phase 11에서 각 후보를 별도 roadmap 제안 / 승인된 장기 보류 / 근거 있는 거절로 기록한다.
“모두 조사했으므로 구현 완료”라고 쓰지 않는다. 승인이 필요한 상태 전환을 문서만으로 수행하지 않는다.
후속 roadmap으로 옮겨도 F20와 원래 감사 provenance를 유지한다.
