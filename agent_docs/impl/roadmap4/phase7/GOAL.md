# Roadmap 4 Phase 7 — Explicit ordered path

## 목표

P-003 `encodePathOrder`로 ordinary Cartesian line과 ranged area가 vertex를 연결하는 순서를 semantic encoding으로
명시한다. x/y는 점의 위치를 계속 소유하고 path order는 topology만 소유한다. 생략하면 기존 automatic
independent-position sort를 그대로 유지한다.

대표 차트 계약은 [Gapminder development trajectories](../chart/gapminder-development-trajectories.md)다.

## 진행 상태

- [x] P6-Exit 승인과 ordinary line/area baseline 확인
- [x] exact 후보 API, semantic owner와 compatibility boundary 작성
- [x] independent stable-order oracle와 fixed vectors
- [x] Gapminder primitive trajectory와 P7-A review evidence
- [x] P7-A 사용자 승인
- [ ] public action, immutable reassignment/removal과 P7-B 사용자 승인
- [ ] consumer matrix, declarations, docs/package와 P7-Exit 사용자 승인

## 후보 public API

```typescript
interface PathOrderEncodingOptions {
  target?: string;
  field: string;
  fieldType?: "quantitative";
  order?: "ascending" | "descending";
}

interface RemovePathOrderOptions {
  target?: string;
}

encodePathOrder(options: PathOrderEncodingOptions): ChartProgram;
removePathOrder(options?: RemovePathOrderOptions): ChartProgram;
```

- `target`은 current compatible path, 그다음 unique compatible path에서만 추론한다.
- `fieldType`은 첫 범위에서 `"quantitative"`만 허용하고 생략 기본도 quantitative다.
- `order` 기본은 `"ascending"`이며 resolved decision을 semantic state에 저장한다.
- 같은 order 값은 각 series 안의 source row order로 안정화한다.
- Field 재할당 또는 ascending/descending 변경은 같은 semantic branch를 교체하고 path를 다시 materialize한다.
- `removePathOrder`는 branch를 제거하고 기존 automatic independent-position sort로 복귀한다.

## State와 topology

```javascript
layer.encoding.pathOrder = {
  field: "year",
  fieldType: "quantitative",
  order: "ascending"
};
```

- 새 scale이나 guide를 만들지 않는다. Order 값은 pixel에 mapping되지 않는다.
- `semanticSpec`은 requested field/direction을 저장하고 `graphicSpec`은 정렬이 적용된 concrete commands만 저장한다.
- Renderer는 field와 order를 읽지 않고 기존 path commands를 그대로 그린다.
- Explicit order가 있으면 repeated x/y row를 합치지 않고 각 eligible source row를 한 vertex로 보존한다.
- Group/color/strokeDash가 만든 각 series를 독립적으로 정렬한다.
- Missing, non-number 또는 non-finite order는 compound topology를 부분적으로 바꾸지 않고 전체 action을 atomic하게
  거부한다.

## Compatibility boundary

- 첫 범위: raw-row Cartesian direct quantitative/temporal line과 ordinary ranged area.
- Aggregate line은 aggregate grain에 order field 의미가 정의되지 않았으므로 거부한다.
- Density/error/regression 같은 generated path는 이미 owning transform이 sample order를 결정하므로 거부한다.
- Polar line은 theta-domain order owner가 있으므로 이 action을 받지 않는다.
- Existing curve builder가 ordered vertices를 받을 수 있을 때만 기존 curve를 유지한다. Non-monotonic trajectory의
  대표 contract는 `curve: "linear"`다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact contract와 independent oracle
2. [STEP2](./STEP2.md) — primitive trajectory visual과 P7-A
3. [STEP3](./STEP3.md) — public semantic action과 path materialization
4. [STEP4](./STEP4.md) — reassignment/removal과 consumer matrix, P7-B
5. [STEP5](./STEP5.md) — declarations/docs/package/cumulative closeout와 P7-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P7-A | approved | exact API/storage/compatibility, stable oracle와 Gapminder primitive PNG | public action 구현 |
| P7-B | planned | public call chain, primitive/public exact parity와 lifecycle/consumer evidence | Phase closeout |
| P7-Exit | planned | Current inventory, declarations, docs/package와 누적 tests | Phase 8 |

모든 Gate는 hard pause다.

## Non-goals

- Path 전체의 draw order, mark z-order 또는 series 순서 변경
- categorical/string order, scale mapping 또는 order legend
- automatic route optimization, nearest-neighbor 연결 또는 edge graph
- generated statistical path의 transform-owned sample order 교체
- Polar theta order, parallel coordinate dimension order 또는 animation sequence
