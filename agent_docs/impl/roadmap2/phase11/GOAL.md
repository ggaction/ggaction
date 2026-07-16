# Roadmap 2 — Phase 11 Goal

## 목표

Canonical Cars regression scatterplot을 기준으로 existing named graphics를 Canvas와 plot 아래에 명시적으로
attach하고, ordinary domain actions가 action 호출 우연이 아닌 stable graphical tree와 draw order를 만들게 한다.
새 chart type이나 user-facing hierarchy action은 추가하지 않는다. Phase 마지막에는 existing chart vertical
slice 전체를 migration하고 Roadmap 2 Planned completion을 executable audit로 종료한다.

Complete variant contract:

- [`../chart/cars-regression-scatterplot-variants.md`](../chart/cars-regression-scatterplot-variants.md)

## 진행 상태

- [ ] Current graphic-tree implementation, flat consumers and migration boundary audit
- [ ] Canonical ownership, placement, validation and equivalence contracts
- [ ] Gate A regression hierarchy primitive and visual approval
- [ ] Canvas/plot root and ordinary mark attachment integration
- [ ] Grid, axis, legend and title ownership and draw-order integration
- [ ] Composite descendants and rematerialization attachment stability
- [ ] Gate B canonical public regression hierarchy approval
- [ ] Existing chart-family hierarchy migration and regression coverage
- [ ] Architecture, contracts, extension docs and executable closeout audits
- [ ] Full local/remote verification and Roadmap 2 closeout

## Target hierarchy

```text
graphicSpec.order
└─ canvas
   ├─ plot-main
   │  ├─ grid graphics
   │  ├─ statistical band graphics
   │  ├─ ordinary mark graphics
   │  ├─ highlighted items inside their owning marks
   │  └─ axis graphics
   ├─ legend graphics
   └─ title graphics
```

- `objects`는 모든 named graphic을 찾는 flat registry로 유지한다.
- `children`은 named graphic ownership과 local draw order를 저장한다.
- `items`는 하나의 drawable mark가 반복해서 그리는 concrete item을 저장한다.
- Ordinary Canvas-first domain flow에서는 Canvas가 유일한 root다.
- Extension API에서 `parent`를 생략한 explicit top-level graphic은 계속 지원한다.
- Container는 ownership/order만 표현하며 clipping, transform 또는 layout inference를 추가하지 않는다.

## Public boundary

Canonical user-facing chain은 바뀌지 않는다.

```javascript
createCarsRegressionScatterplot(rows);
```

사용자는 `plot-main`, `parent`, `before`, `after`를 전달하지 않는다. `createCanvas`가 graphical root를 만들고,
mark/guide/composite action이 semantic role과 existing graphic state에서 owner와 sibling position을 infer한다.
Mark creation과 positional encoding의 상대 호출 순서는 계속 독립적이다.

## Drawing-order contract

```text
Canvas background
→ grid
→ statistical band
→ ordinary marks
→ selected/highlighted items within each mark
→ axes
→ legends
→ title
```

Rematerialization은 existing node의 concrete properties/items만 reconcile하고 attachment와 sibling order를
보존한다. Node cardinality 또는 concrete type이 바뀌어도 stable named owner는 이동하지 않는다.

## Gates

### Gate A — Primitive hierarchy

Exact primitive source, target public chain, rendered `primitive.png`, stored tree와 draw order를 함께 보여준다.
승인 전에는 domain-action attachment migration을 시작하지 않는다.

### Gate B — Public hierarchy

Canonical public source, `user-facing.png`, primitive/public tree와 pixel equivalence, resize/edit 뒤 attachment를
함께 보여준다. 승인 전에는 existing chart family 전체 migration과 Phase closeout을 시작하지 않는다.

## 실행 순서

```text
STEP1   current tree/consumer/migration audit
STEP2   ownership, validation and equivalence contracts
STEP3   Gate A regression hierarchy primitive
  ↓ Gate A
STEP4   Canvas/plot and mark attachment integration
STEP5   guide ownership and deterministic draw order
STEP6   composite descendants and rematerialization stability
STEP7   Gate B canonical public regression hierarchy
  ↓ Gate B
STEP8   all existing chart-family migration
STEP9   robustness, architecture, contracts and public docs
STEP10  Roadmap 2 executable closeout and full CI/Pages verification
```

## 완료 조건

- After Gate A approves the intentional band-before-points correction, canonical hierarchy primitive/public regression
  programs have equivalent semantic state, concrete tree, renderer calls and pixels.
- Every ordinary Canvas-first public example produces a reachable, duplicate-free named graphic tree.
- Grid, band, mark, highlight and axis ordering is deterministic after Canvas, scale, data and appearance edits.
- Subtree removal, invalid attachment and immutable structural copy are executable contracts.
- Current primitive/domain/type/docs evidence agrees and no accepted capability remains in Planned.
- Roadmap 2 gallery contains only complete approved pairs and all local/remote quality gates pass.

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
