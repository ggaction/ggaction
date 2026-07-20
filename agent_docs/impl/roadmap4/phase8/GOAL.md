# Roadmap 4 Phase 8 — Categorical density placement

## 목표

NCP-001을 기존 `encodeDensity`의 category-placement branch로 구현하고, 같은 capability를 positional-family
facade `createViolinPlot({ x, y })`로 노출한다. Density 계산은 기존 immutable derived-data lifecycle을 재사용하고,
범주 center와 density width는 한 Cartesian coordinate 안에서 materialize한다.

대표 계약은 [Cars acceleration violins](../chart/cars-acceleration-violins.md)다.

## 진행 상태

- [x] Phase 7 exit 승인과 density/area baseline 조사
- [x] candidate lower-level/facade API와 state owner 설계
- [x] independent categorical-density oracle와 full/split primitive
- [x] P8-A 사용자 승인
- [x] category placement grammar/materialization과 P8-B review package
- [ ] P8-B 사용자 승인
- [ ] lifecycle/consumer matrix, facade, docs/package와 P8-Exit 사용자 승인

## 후보 public API

```typescript
type DensityPlacement =
  | { type: "baseline" }
  | {
      type: "category";
      side?: "both" | "left" | "right" | "top" | "bottom";
      width?: {
        band?: number;
        resolve?: "shared" | "independent";
      };
      split?: {
        field: string;
        domain?: readonly [unknown, unknown];
      };
      scale?: ScaleOptions;
    };

encodeDensity({
  ...existingDensityOptions,
  placement?: DensityPlacement
}): ChartProgram;

editDensity({
  ...existingDensityEditOptions,
  placement?: DensityPlacement
}): ChartProgram;

createViolinPlot({
  id?, data?, coordinate?, x, y,
  split?, color?, density?, area?, guides?
}): ChartProgram;
```

### Default와 inference

- `placement` 생략은 기존 baseline density와 exact compatible하다.
- `{ type: "baseline" }`은 edit에서 category placement를 명시적으로 제거한다.
- `{ type: "category" }`의 category field는 `groupBy`에서 읽는다. `groupBy`가 없으면 plot center에 single
  violin 하나를 만든다.
- Category placement의 `densityChannel` 생략 기본은 `"x"`다. 따라서 category→x, value→y인 vertical
  violin이 최소 호출이다. Explicit `"y"`는 horizontal violin이다.
- `side` 기본은 `"both"`; x width에는 left/right, y width에는 top/bottom만 허용한다.
- `width.band` 기본은 `0.8`, 범위는 `(0, 1]`; `width.resolve` 기본은 `"shared"`다.
- `shared`는 모든 profile에 하나의 density maximum을 사용한다. `independent`는 category별 maximum을 사용하되
  split의 두 half는 같은 category maximum을 공유한다.
- `split.domain` 생략은 observed split 값이 정확히 두 개일 때만 first-appearance order로 추론하고 저장한다.
  Explicit domain은 서로 다른 두 값이며 source의 모든 observed split 값을 포함해야 한다.
- Split의 첫 값은 left/top, 둘째 값은 right/bottom half를 소유한다. `side`와 `split`은 함께 쓸 수 없다.
- Category branch에서 `valueScale`은 quantitative value axis를, `placement.scale`은 category band를 소유한다.
  기존 `densityScale`은 같은 channel에 두 scale 의미를 만들므로 거부한다.

### `createViolinPlot` positional family

- `x`와 `y`를 모두 받고 exactly one categorical + one quantitative role을 요구한다.
- Categorical role을 `groupBy`와 placement scale로, quantitative role을 density input/value scale로 변환한다.
- Orientation, target/data/coordinate와 compatible scales를 기존 Box/GradientPlot positional-family 순서로
  추론한다.
- `density`는 bandwidth/extent/steps/kernel/normalization과 width policy만 소유한다.
- `area`는 opacity/fill/stroke 같은 graphical appearance만 소유한다.
- `split`과 `color`는 독립이다. Split geometry를 color로 표현하려면 같은 field를 명시한다.
- Facade는 thin aggregate이며 wrapped `createAreaMark`, `encodeDensity`, optional `encodeColor`, `createGuides`를
  호출한다. Child actions가 validation과 materialization을 계속 소유한다.

## Stored state와 geometry

- Density derived dataset은 source, input field, category, optional split, kernel, normalization, resolved bandwidth,
  extent와 output fields를 provenance로 저장한다.
- Layer는 category/value semantic binding과 composite generated-series identity를 저장한다.
- Category placement intent는 semantic density provenance에 저장하고, concrete center/half-width/path commands는
  `graphicSpec`에만 저장한다.
- Renderer는 density/category/split을 읽지 않고 closed path commands를 그린다.
- One coordinate 안에서 category band center와 value scale을 공유하며 child chart를 category마다 복제하지 않는다.

## 실행 순서

1. [STEP1](./STEP1.md) — exact candidate contract와 independent oracle
2. [STEP2](./STEP2.md) — full/split primitive visual과 P8-A
3. [STEP3](./STEP3.md) — category placement grammar, provenance와 area materialization
4. [STEP4](./STEP4.md) — edit lifecycle, half/split/resolve와 consumer matrix
5. [STEP5](./STEP5.md) — `createViolinPlot` facade, public parity와 P8-B
6. [STEP6](./STEP6.md) — declarations/docs/package/cumulative closeout와 P8-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P8-A | approved | exact API/defaults/state, full/split primitive PNG | production grammar/action 구현 |
| P8-B | ready-for-review | lower-level lifecycle/consumer matrix, facade chain과 primitive/public exact parity | Phase closeout |
| P8-Exit | planned | Current inventory, architecture, docs/types/package와 cumulative verification | Phase 9 |

모든 Gate는 hard pause다.

## Non-goals

- Weighted KDE, adaptive bandwidth 또는 multivariate density
- Raincloud의 raw points/box component와 ridgeline offset
- More than two split values, nested categories 또는 dodge layout
- Polar violin, per-profile custom kernel 또는 renderer-side density inference
