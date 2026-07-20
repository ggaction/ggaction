# Roadmap 4 Phase 4 — Deterministic bounded point jitter

## 목표

NCP-003 `jitterPoints`를 원 x/y semantic encoding을 보존하는 point 전용 graphical layout action으로
구현한다. 같은 input, seed와 stable key는 같은 logical-pixel displacement를 만들며 Canvas, scale, data와
point appearance edit 뒤에도 원래 scale position에서 비누적 재계산한다.

## 진행 상태

- [x] Phase 3 exit 승인과 B-002 default point radius baseline 확인
- [x] exact API, state owner, hash와 containment 계약 작성
- [x] Cars vertical / Gapminder horizontal primitive 작성
- [x] P4-A 사용자 승인
- [ ] public action, lifecycle와 rematerialization 구현
- [ ] P4-B 사용자 승인
- [ ] declarations, contracts, package와 누적 회귀 closeout
- [ ] P4-Exit 사용자 승인

## 확정 후보 API

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

- `jitterPoints` 재호출은 같은 target의 policy를 교체한다. 이전 final position에 offset을 누적하지 않는다.
- `removeJitter`는 stored policy와 resolved metadata를 제거하고 원 scale position으로 point를 되돌린다.
- `target`은 current 또는 유일한 compatible point에서만 추론한다. 여러 후보 중 첫 mark를 선택하지 않는다.
- `channel`은 graphical displacement axis다. 반대 position channel은 exact base coordinate를 유지한다.
- `pixels`는 pixelRatio 적용 전 logical Canvas pixel의 positive finite maximum이다.
- `band`는 nominal/ordinal jitter channel에서만 허용하며 `(0, 0.5]`다. Resolved scale의 positive
  `bandwidth`, 없으면 absolute `step`을 effective slot width로 사용한다.
- `seed` default는 `0`이며 implicit random seed는 없다.
- `key`는 valid materialized item에서 unique한 string, finite number 또는 boolean field다.

## State와 materialization

- x/y field, field type, scale와 coordinate는 변경하지 않는다.
- Jitter는 chart meaning이 아니라 graphical layout이므로 `semanticSpec`에 새 field나 encoding을 만들지 않는다.
- Requested policy와 resolved item metadata는 `materializationConfigs.jitters[target]`가 소유한다.
- `graphicSpec`에는 final concrete center만 저장하며 renderer branch를 추가하지 않는다.
- `jitter-uniform-v1`은 target, channel, seed와 key 또는 stable source identity를 type-tagged canonical string으로
  만들고 portable 32-bit hash로 `[-maxOffset, +maxOffset)`에 mapping한다.
- Radius, shape bounds와 stroke half-width를 포함한 point extent가 category slot 또는 plot을 넘으면 final
  offset을 item별 clamp한다. 공간이 없으면 offset 0과 warning metadata를 저장한다.
- Highlight는 jitter 뒤 적용한다. Explicit highlight offset은 user-owned 후처리이므로 jitter containment를
  넘어갈 수 있지만 재물질화 때 누적되지는 않는다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact contract, proposal inventory와 independent oracle
2. [STEP2](./STEP2.md) — primitive visual targets와 P4-A
3. [STEP3](./STEP3.md) — public action, immutable state와 point materialization
4. [STEP4](./STEP4.md) — edit/removal, dependency와 selection/facet integration
5. [STEP5](./STEP5.md) — declarations, package, docs와 P4-B
6. [STEP6](./STEP6.md) — Phase closeout와 P4-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P4-A | approved | API/lifecycle, band/hash/containment 계약, 두 primitive 이미지 | public action 구현 |
| P4-B | planned | public call chain, primitive parity, rematerialization/selection evidence | Phase closeout |
| P4-Exit | planned | declarations, Current inventory, package/docs와 누적 tests | Phase 5 |

모든 Gate는 hard pause다.

## Non-goals

- collision-free beeswarm, force simulation 또는 packing
- density-local silhouette와 sina placement
- category dodge/group slot 생성
- source quantitative 값에 noise 추가
- `createStripPlot`, `createRaincloud` 또는 jitter 전용 guide
- Polar point jitter
