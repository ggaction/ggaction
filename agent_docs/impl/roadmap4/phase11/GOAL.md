# Roadmap 4 Phase 11 — Parallel Coordinates

## 목표

NCP-004를 Parallel coordinate resource, atomic ordered-dimension encoding과 complete-chart facade로 구현한다.
각 source row는 dimension-local scales를 통과하는 한 semantic path item이며, 최종 renderer는 ordinary
backend-neutral path/line/text graphics만 소비한다.

대표 계약은 [Cars Parallel Coordinates](../chart/cars-parallel-coordinates.md)다.

## 진행 상태

- [x] P9-Exit 사용자 승인
- [x] Phase 10 skipped와 P-006 `Maybe Future` 이동
- [x] Phase 11 GOAL, 전체 STEP과 candidate chart contract 작성
- [x] P11-A exact contract, independent oracle와 primitive visual 승인
- [x] Parallel coordinate/encoding/materialization 구현
- [x] Facade, guides, appearance와 selection lifecycle 구현
- [x] P11-B public visual/lifecycle 승인
- [x] declarations/contracts/docs/package closeout
- [x] P11-Exit 사용자 승인

## 핵심 Candidate 계약

- `createParallelCoordinates({ dimensions, ... })`는 wrapped `createCoordinate({ type: "parallel" })`, line mark,
  `encodeParallelCoordinates`, applicable appearance encodings와 guides를 조립한다.
- Coordinate는 family/attachment만 소유하고 ordered field assignment는 `encoding.parallel`이 한 번만 소유한다.
- Dimension은 string shorthand 또는 `{ field, fieldType?, title?, scale? }`이며 최소 2개다.
- `key`는 optional이고 생략 시 source lineage identity를 사용한다. 임의의 field를 key로 추측하지 않는다.
- Dimension scales는 target+dimension으로 namespace하며 existing scale type/domain/range/nice/zero/reverse contract를
  재사용한다.
- Missing 기본은 `break`; `drop-row | error`를 지원한다.
- Existing compatible Parallel coordinate는 재사용하고 ambiguity는 explicit `coordinate`를 요구한다.
- `createCoordinate`는 structural create-only, `encodeParallelCoordinates` 재호출은 ordered assignment를 atomic하게
  교체한다.

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P11-A | approved | exact API/default/error/state, independent oracle, Cars primitive source와 PNG | production grammar/action 구현 |
| P11-B | approved | facade hierarchy, primitive/public parity, guide/selection/edit lifecycle | public closeout |
| P11-Exit | approved | Current inventory, architecture, docs/types/package와 cumulative verification | Phase 12 |

모든 Gate는 hard pause다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact candidate와 independent oracle
2. [STEP2](./STEP2.md) — Cars primitive target과 P11-A
3. [STEP3](./STEP3.md) — Parallel coordinate, encoding과 dimension scales
4. [STEP4](./STEP4.md) — row-path materialization과 lifecycle
5. [STEP5](./STEP5.md) — axes, facade, appearance/selection과 P11-B
6. [STEP6](./STEP6.md) — declarations/docs/package/cumulative closeout와 P11-Exit

## Non-goals

- Interactive brushing/reordering, animation와 path bundling
- Renderer 전용 Parallel primitive
- Temporal dimension과 multi-coordinate shared axis
- `editCoordinate` 또는 facade-level `editParallelCoordinates`
