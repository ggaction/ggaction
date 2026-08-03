# STEP 1 — Center Area Primitive and Public Flow

## 진행 상태

- [x] Existing area derivation, color layout, stack vocabulary와 scale-domain boundary 확인
- [x] Visual target data와 two-panel comparison 범위 선택
- [x] Independent zero/center reference values와 invariants 작성
- [x] Primitive comparison, review metadata와 four-renderer artifacts 작성
- [x] R5-P5-V approval — 2026-08-03
- [ ] Center partition grammar와 area series derivation 구현
- [ ] Position/color orchestration, scale domain과 rematerialization 구현
- [ ] Runtime/type/current contract/docs/package synchronization
- [ ] Stable visual graduation, focused/cumulative verification와 Roadmap closeout 준비

## Approved contract

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

- `encodeColor({ layout: "center" })`는 같은 mark의 y assignment를 wrapped
  `encodeY({ stack: "center" })`로 동기화한다.
- 각 aligned x partition에서 source category order를 보존하고 `-total / 2`부터 non-negative 값을 쌓는다.
- Original quantitative field는 y encoding에 유지하고 resolved lower/upper endpoint는 concrete area path에만 둔다.
- Renderer는 stack, grouping, baseline 또는 scale domain을 추론하지 않는다.

## Visual target

- Source: repository `data/jobs.json` actual census occupation counts.
- Series: Farmer, Operative, Clerical Worker, Teacher, Nurse.
- Grain: `year × job`; men/women count를 합산하고 source year 순서를 보존한다.
- Panels: 같은 values/order/colors의 zero stack과 center stack.
- Curve: initial visual oracle은 exact thickness 검증이 쉬운 linear path를 사용한다. Public example에서 approved
  geometry를 보존하는 한 curve는 `monotone`으로 승격할 수 있다.
- Guides: shared year ticks, panel별 value guide, center panel의 emphasized zero rule와 one shared category key.

## Required evidence

- 모든 year에서 zero lower bound `0`, center full extent `[-total / 2, total / 2]`
- category별 `upper - lower === source count`, deterministic source category order와 aligned year validation
- Caller-owned Jobs rows와 earlier program immutability
- Negative, misaligned, missing/non-finite, zero-total partitions의 explicit policy tests
- `encodeY` direct center와 `encodeColor` companion equivalence, trace hierarchy와 atomic rejection
- Auto/explicit y domains, guides, filter/facet/Canvas/scale replay와 area selection/highlight
- Canvas/SVG/PNG/PDF primitive/public exact equivalence, strict types, contracts, docs와 installed package
