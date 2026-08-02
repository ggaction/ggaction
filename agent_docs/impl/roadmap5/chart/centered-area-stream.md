# Centered Area Stream

## 차트 목적

여러 non-negative area series를 각 x position의 합계 중심에 맞춰 위아래로 배치한다. Existing zero stack과
나란히 비교해 center baseline만 달라지고 series order와 두께는 보존되는지 검증한다.

## Proposed final user-facing API

```javascript
chart()
  .createCanvas({ width: 780, height: 440 })
  .createData({ id: "series", values })
  .createAreaMark({ id: "stream", curve: "monotone" })
  .encodeX({ target: "stream", field: "date", fieldType: "temporal" })
  .encodeY({ target: "stream", field: "value", fieldType: "quantitative" })
  .encodeColor({
    target: "stream",
    field: "category",
    fieldType: "nominal",
    layout: "center"
  })
  .createGuides();
```

## Action hierarchy

```text
encodeColor({ layout: "center" })
├─ encodeGroup
├─ encodeY({ stack: "center" })
├─ editSemantic(color assignment)
└─ rematerializeAreaMark
```

## Stored-result contract

- Color encoding stores categorical field, scale and normalized `layout: "center"`.
- Y encoding stores `stack: "center"` and the original quantitative field.
- At each aligned x, every series thickness equals its source value and the complete stack spans
  `[-total / 2, total / 2]`.
- Concrete lower/upper area paths and sampled fills live in `graphicSpec`.
- Renderer performs no stacking, grouping or baseline inference.

## Visual acceptance

- Center stack is vertically centered at zero for every x position.
- Series thickness and category order match the zero-stack comparison.
- Axis domain contains all centered bounds and guides do not clip the outer series.
- All four renderers show equivalent paths, fill order and clipping.

## Non-goals

- Wiggle baseline or aesthetic slope minimization
- Negative/diverging values or centered bars
- Missing-position imputation or interpolation policy beyond current area behavior
