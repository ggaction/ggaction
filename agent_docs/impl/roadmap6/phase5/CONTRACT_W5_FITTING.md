# Phase 5 W5 — Opt-in Canvas fitting과 Cartesian guide label layout

## 공개 경계

```typescript
fitCanvas({
  padding?: number;
  minPlotWidth?: number;
  minPlotHeight?: number;
  iterationLimit?: number;
  overflow?: "error" | "report";
} = {}): ChartProgram;
```

`fitCanvas`는 Full unit program의 기존 Canvas와 현재 유효한 layout resource를 입력으로
네 margin을 줄여 plot 영역을 확장한다. Canvas width/height, semantic state와 explicit
resource option은 바꾸지 않는다. Basic에는 공개하지 않으며 composition 호출은 명시적 scope
오류로 거부한다.

기본값은 `padding: 0`, `minPlotWidth: 160`, `minPlotHeight: 120`,
`iterationLimit: 32`, `overflow: "error"`다. 각 edge는 0.25px 격자에서 bounded binary
search하며 호출 순서는 top→right→bottom→left로 고정한다. 각 probe는 기존
`editCanvas({margin})` materialization과 최종 guide collision 검증을 그대로 사용한다.

성공 결과는 `materializationConfigs.fitting`에 normalized policy와 final margin/plot,
probe 수, 상태와 layout signature를 저장한다. 같은 layout과 policy의 반복 호출은
graphic/config가 정확히 같은 결과로 수렴한다. 이후 resource가 바뀌면 signature가 달라져
다음 명시적 `fitCanvas` 호출이 다시 계산한다. Fitting은 자동 compiler나 persistent resize
observer가 아니다.

`overflow: "error"`는 padding, iteration bound 또는 최소 plot을 만족하지 못하면 원자적으로
실패한다. `"report"`는 가능한 마지막 유효 margin을 적용하고 `status: "overflow"`와
구체적인 issues를 저장한다. 어느 모드도 Canvas를 조용히 확대하거나 요청한 guide를 옮기지
않는다.

## Cartesian axis label 확장

`create/edit X/YAxisLabels`, ticks-and-labels group, complete axis facade의 label style에
다음을 추가한다.

```typescript
rotation?: number | { value: number; unit: "radians" | "degrees" };
maxWidth?: number | false;
wrap?: "word" | "character";
lineHeight?: number;
overlap?: "error" | "allow";
```

- Legacy numeric rotation은 radians이며 구조형 입력은 단위를 명시한다. 기본값은 `0`이다.
- Positive `maxWidth`는 각 tick value의 표시 문자열을 shared deterministic text metric으로
  줄바꿈한다. `wrap` 기본은 `"word"`이며 oversized word는 Unicode code point 단위로
  나뉜다. `lineHeight` 기본은 `fontSize * 1.2`이고 fontSize 이상이어야 한다.
- Edit의 `maxWidth: false`는 wrap/lineHeight를 함께 제거한다. 같은 호출에서 wrap 또는
  lineHeight를 같이 지정하면 거부한다.
- `overlap` 기본은 `"error"`로 기존 동작을 보존한다. `"allow"`는 label-label 충돌만
  명시적으로 허용하며 Canvas 밖 배치와 axis title 충돌은 계속 거부한다.
- Wrapped line은 최종 concrete text item으로 저장한다. Renderer는 측정이나 wrapping을
  다시 하지 않는다. Canvas/scale replay는 stored policy로 base tick text부터 다시 만든다.

## 검증 범위

- Fixed width/height, margin-only child edit, immutable input, 0.25px output과 exact repeated
  convergence.
- Invalid policy, Canvas 부재, Basic/composition 경계, minimum plot error/report와 bounded
  iteration.
- 긴 ordinal label의 default collision, explicit rotation, word/character wrap, reset,
  explicit overlap, complete-axis forwarding과 Canvas replay.
- Semantic/scale-domain/order 불변성, explicit-range 보존, concrete bounds와 render parity, Current contract/card,
  docs, package, installed/browser consumer를 W5 종료 전에 검증한다.
