# Roadmap 3 Phase 9 — Directional Parity, Text Annotation, and Rect Heatmap

## 진행 상태

- [x] STEP 1 — Phase 계약, representative chart와 Gate 분리
- [x] STEP 2 — Horizontal grouped bar primitive와 Gate J-A
- [x] STEP 3 — Shared offset grammar와 `encodeYOffset`
- [x] STEP 4 — Horizontal grouped bar public vertical slice
- [ ] STEP 5 — Text reference grammar, primitive와 Gate J-B
- [ ] STEP 6 — Text mark, `encodeText`와 focused editing
- [ ] STEP 7 — Annotation public variants와 rematerialization
- [ ] STEP 8 — Rect reference grammar, primitive와 Gate J-C
- [ ] STEP 9 — Rect mark와 heatmap public vertical slice
- [ ] STEP 10 — Cross-capability coverage, docs와 Phase closeout

## 목표

Phase 9은 Cartesian authoring의 방향 대칭성을 완성하고, data-owned text와 two-dimensional rect cell을
ordinary chart-authoring API에 추가한다. 세 capability는 서로 다른 stable semantic owner를 갖지만 기존
scale, coordinate, guide, selection/highlight와 rematerialization 경계를 재사용한다.

대표 chart 계약은 다음과 같다.

- [Horizontal Grouped Bar](../chart/horizontal-grouped-bar.md)
- [Annotated IMDb Scatterplot](../chart/annotated-imdb-scatterplot.md)
- [Gapminder Life Expectancy Heatmap](../chart/gapminder-life-expectancy-heatmap.md)

## Public surface

```typescript
encodeYOffset({
  target?: string;
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: ScaleReference;
  paddingInner?: number;
  paddingOuter?: number;
}): ChartProgram;

createTextMark(options?: TextMarkOptions): ChartProgram;
encodeText({ target?: string; field?: string; value?: unknown; format?: string }): ChartProgram;
editTextMark(options: TextMarkEditOptions): ChartProgram;

createRectMark(options?: RectMarkOptions): ChartProgram;
editRectMark(options: RectMarkEditOptions): ChartProgram;
```

`encodeColor({ layout: "group" })`는 bar orientation을 해석해 vertical bar에서는 `encodeXOffset`, horizontal
bar에서는 `encodeYOffset`을 wrapped child로 호출한다. 사용자가 ordinary grouped bar를 만들기 위해 offset
action을 직접 조율할 필요는 없다. Direct `encodeYOffset`은 explicit offset assignment와 advanced coverage를
위해 유지한다.

## Shared rules

- `yOffset`은 `xOffset`과 같은 ordinal domain order, padding, explicit/reversed range와 scale lifecycle을 가진다.
- Offset geometry는 orientation별 action에 복제하지 않고 channel-aware pure grammar와 bar materializer가 소유한다.
- Text와 rect는 기존 concrete primitive를 ordinary semantic mark로 승격하지만 renderer에 semantic 추론을 추가하지 않는다.
- Text position은 explicit encoding이 우선하고, 생략되면 current 또는 unique compatible layer의 Cartesian position을
  persisted semantic encoding으로 상속한다.
- Rect는 two discrete positions 또는 x/x2와 y/y2 endpoint pair만 materialize한다. Incomplete position은 semantic
  intent만 보존하며 placeholder graphic을 만들지 않는다.
- Selection/highlight는 text row와 rect cell이라는 final visual grain을 사용한다.
- 모든 create action은 deterministic role ID가 유일할 때 ID를 생략할 수 있고 ambiguity에서는 explicit target을 요구한다.

## Hard Gates

- Gate J-A: Jobs horizontal grouped bar의 category/offset geometry, vertical grid, axes와 categorical legend를 승인한다.
- Gate J-B: IMDb scatter labels의 inherited position, content, typography와 overlap policy를 승인한다.
- Gate J-C: Gapminder heatmap의 cell geometry, continuous color legend와 optional text overlay를 승인한다.

각 Gate는 executable primitive, exact target call chain과 PNG를 함께 제시한다. 승인 전에는 해당 capability의
public implementation을 시작하지 않는다.

## Closeout requirement

Phase closeout은 `directional-offset`, `text-annotation`, `rect-heatmap`과 배정된 direct action을 Planned에서
Current로 승격한다. Runtime, exact TypeScript, current contracts, public docs, package consumer, browser/PNG
pair와 architecture record가 일치하고 Phase 9 capability가 Planned inventory에 남지 않음을 contract test로
증명한다.
