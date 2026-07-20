# P4-A — Deterministic bounded point jitter

## 진행 상태

- [x] exact `jitterPoints` / `removeJitter` 후보 계약
- [x] requested policy와 resolved graphic state ownership
- [x] portable `jitter-uniform-v1` fixed vectors
- [x] point extent와 plot/category slot containment
- [x] Cars x-jitter와 Gapminder y-jitter primitive targets
- [x] stable key reorder invariance와 semantic-coordinate 보존
- [x] 2x Node PNG, 전체 render와 Roadmap 4 gallery 검증
- [x] 전체 test suite와 coverage
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

승인 checkpoint: `aed50d6` (`origin/main`)

## 승인할 후보 API

```typescript
type JitterMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };

interface JitterPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset: JitterMaxOffset;
  seed?: string | number;
  key?: string;
}

jitterPoints(options: JitterPointsOptions): ChartProgram;
removeJitter(options?: { target?: string }): ChartProgram;
```

`maxOffset`은 logical Canvas pixel 또는 categorical slot 비율 중 하나만 받는다. `band` 범위는
`(0, 0.5]`이며 positive bandwidth, 없으면 absolute step을 slot width로 사용한다. Seed default는 `0`이고
implicit randomness는 없다. `target`은 current 또는 유일한 compatible point에서만 추론한다.

## 승인할 call chains

Cars vertical strip target:

```javascript
program
  .createPointMark({ id: "observations", data: "cars-jitter", opacity: 0.58 })
  .encodeX({
    target: "observations",
    field: "Origin",
    fieldType: "nominal",
    scale: { domain: ["USA", "Europe", "Japan"] }
  })
  .encodeY({
    target: "observations",
    field: "Acceleration",
    fieldType: "quantitative",
    scale: { domain: [7, 25], zero: false }
  })
  .jitterPoints({
    target: "observations",
    channel: "x",
    maxOffset: { band: 0.168 },
    seed: "cars-origin-strip",
    key: "Name"
  });
```

Gapminder horizontal strip target:

```javascript
program
  .createPointMark({ id: "observations", data: "gapminder-jitter", opacity: 0.62 })
  .encodeX({
    target: "observations",
    field: "life_expect",
    fieldType: "quantitative",
    scale: { domain: [45, 85], zero: false }
  })
  .encodeY({
    target: "observations",
    field: "cluster",
    fieldType: "nominal",
    scale: { domain: [0, 1, 2, 3, 4, 5] }
  })
  .jitterPoints({
    target: "observations",
    channel: "y",
    maxOffset: { band: 0.16 },
    seed: "gapminder-cluster-strip",
    key: "country"
  });
```

## State와 lifecycle

- x/y semantic encoding과 source data는 바꾸지 않는다.
- Requested policy와 resolved item metadata는 `materializationConfigs.jitters[target]`가 소유한다.
- `graphicSpec`은 clamp까지 끝난 concrete center만 저장한다. Renderer branch는 추가하지 않는다.
- 같은 target의 `jitterPoints` 재호출은 semantic base position에서 policy를 교체한다. Offset을 누적하지 않는다.
- `removeJitter`는 policy와 resolved metadata를 제거하고 base position을 복구한다.
- Stable key가 있으면 source row 순서가 바뀌어도 같은 item의 offset은 동일하다.
- Point radius, shape bounds와 stroke half-width까지 slot/plot 안에 들어오도록 item별 clamp한다.

## 검증 증거

- Focused contract/oracle/primitive: 11/11 pass
- Focused Node PNG: 2/2 pass
- Full suite: 1635/1635 pass
- Coverage: 94.89% lines, 90.30% branches, 98.53% functions; critical floors 55/55
- Full render: 117/117 pass
- Roadmap 2/3/4 gallery Browser verification pass
- Cars PNG: `1280 × 880` physical pixels at 2x
- Gapminder PNG: `1360 × 920` physical pixels at 2x

## 승인 전 경계

이 Gate에는 independent oracle과 low-level primitive targets만 있다. `jitterPoints`와 `removeJitter`는 runtime,
TypeScript declarations, `ACTION_INDEX`와 public docs에 아직 존재하지 않는다. 승인 후에만 public action,
replacement/removal, dependency rematerialization과 selection/facet integration을 구현한다.

## Non-goals

- collision-free beeswarm, force simulation 또는 density-local packing
- category dodge/group slot 생성
- source quantitative 값 자체에 noise 추가
- Polar jitter와 jitter 전용 guide 또는 chart facade
