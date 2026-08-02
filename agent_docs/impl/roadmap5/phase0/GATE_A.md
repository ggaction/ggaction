# Gate R5-P0-A — Temporal, Ordering, and Direction Contract Proposal

## Gate state

`ready-for-review`

## 쉽게 보는 승인 내용

이번 승인은 “지금 바로 여섯 기능을 구현한다”는 뜻이 아니라, 구현할 때 아래 규칙을 지키기로 먼저 확정하는
승인이다.

1. 시간 단위는 어디서 실행해도 같은 결과가 나오도록 UTC로 자른다.
2. 범주 순서는 차트가 기억하는 의미로 저장하고, 원래 자동 순서로 되돌리는 action도 만든다.
3. Moving window의 숫자는 시간 길이가 아니라 정렬된 행 개수다.
4. Tick은 우선 x와 y가 모두 있는 작은 선분이다. Plot 가장자리 rug는 이번 범위가 아니다.
5. Angle 값은 degree 그대로 쓴다. 0°는 위쪽, 양수는 시계 방향이며 point와 Tick에만 적용한다.
6. Center stack은 음수가 없는 area series만 가운데로 쌓는다. Wiggle과 centered bar는 하지 않는다.

## Review target

### New actions

```text
createTimeUnitData
orderCategories
removeCategoryOrder
createTickMark
editTickMark
encodeAngle
```

### Existing action extensions

```text
createWindowData   movingMean, movingSum row-frame operations
removeEncoding    angle channel reset
encodeY           stack: "center"
encodeColor       area layout: "center"
```

Exact option/type shapes는 [`../PROPOSALS.json`](../PROPOSALS.json)이 소유한다.

## Recommended decisions

1. `createTimeUnitData`는 UTC bucket 시작의 numeric timestamp를 새 field에 쓴다.
2. Week와 local timezone은 제외하고 year/quarter/month/day/hour/minute/second를 지원한다.
3. Category order는 explicit values, category value, count, quantitative summary를 지원한다.
4. Explicit category list에서 빠진 observed 값과 computed tie는 stable first appearance를 사용한다.
5. Moving mean/sum은 operation별 required `preceding`과 optional `following: 0` row frame을 사용한다.
6. Partition edge는 window를 잘라 사용하며 `minPeriods`나 time-duration frame은 추가하지 않는다.
7. Tick은 centered fixed-length item glyph이며 x/y 둘 다 필요하다.
8. Angle은 scale-free direct degree다. Point와 Tick만 지원하고 circle의 visual no-op도 valid assignment다.
9. Center layout은 non-negative aligned area series에서 `-total / 2` baseline을 사용한다.
10. Visual primitive를 먼저 검토한 뒤 Tick/Angle과 center public action을 연결한다.

## Representative chart contracts

- [`monthly-moving-average.md`](../chart/monthly-moving-average.md) — Time unit + moving window
- [`ordered-category-bar.md`](../chart/ordered-category-bar.md) — Semantic order + reset
- [`directional-tick-plot.md`](../chart/directional-tick-plot.md) — Tick + Angle, point comparison
- [`centered-area-stream.md`](../chart/centered-area-stream.md) — Center stack

## Compatibility and architecture impact

- Additive methods/types 또는 previously rejected option value만 추가한다.
- Existing valid programs, Canvas/PNG/SVG/PDF signatures와 package entries는 유지한다.
- Derived transforms는 immutable dataset flow, category/angle은 semantic assignment flow를 사용한다.
- Renderers는 계속 fully materialized `graphicSpec`만 읽는다.
- Tick은 새 mark lifecycle owner가 필요하지만 새 renderer-specific primitive는 필요하지 않다.
- Top-level program schema나 automatic semantic-to-graphic compiler는 추가하지 않는다.

## Evidence

- Current findings and recommended boundary: [`STEP1.md`](./STEP1.md)
- Scope, dependencies and completion criteria: [`../ROADMAP.md`](../ROADMAP.md)
- Machine-readable proposed-only inventory: [`../PROPOSALS.json`](../PROPOSALS.json)
- `npm run test:contracts` — 160/160 pass
- `npm run test:unit` — 1308/1308 pass
- `npm run test:package` — pass, packed `ggaction@0.0.7` consumer verified
- Remote checkpoint: pending commit/push

## Approval effect

Approval은 exact proposal과 Phase 순서의 구현을 허용한다. 승인 뒤 accepted subset만 Planned inventory에 올리고
Phase 1을 시작한다. PR creation, package publish, documentation deployment와 release 권한은 포함하지 않는다.

## Work blocked before approval

- Runtime source/materializer changes
- Public declarations and current contract promotion
- `ACTION_INDEX.json` Planned/Current promotion
- Phase 1 implementation and later Gates
