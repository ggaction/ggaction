# P3-B — Field-driven stroke width

## 진행 상태

- [x] `encodeStrokeWidth` constant/field discriminated contract
- [x] rule item grain과 line series grain validation
- [x] independent `strokeWidth` scale, edit rematerialization과 stale cleanup
- [x] sampled line legend creation, removal과 scale-edit rematerialization
- [x] primitive/public exact parity
- [x] Browser Canvas와 2x Node PNG
- [x] public declaration, Current contract, docs와 generated references
- [x] full tests, coverage와 packed-package consumer
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

구현 checkpoint: `8c631da` (`origin/main`)

## 승인할 public call chain

```javascript
const program = chart()
  .createCanvas({
    width: 520,
    height: 320,
    margin: { top: 40, right: 160, bottom: 40, left: 40 }
  })
  .createData({ values: rows })
  .createRuleMark({ id: "cars" })
  .encodeX({
    field: "Acceleration",
    fieldType: "quantitative",
    scale: { domain: [5, 50] }
  })
  .encodeX2({ field: "Miles_per_Gallon", fieldType: "quantitative" })
  .encodeY({
    field: "Horsepower",
    fieldType: "quantitative",
    scale: { domain: [40, 240] }
  })
  .encodeStrokeWidth({
    field: "Weight_in_lbs",
    scale: { domain: [1500, 5200], range: [1, 8] }
  })
  .createLegend({ channels: ["strokeWidth"], count: 5 });
```

위 예시는 Cars의 8개 row를 8개 rule item으로 유지한다. `Weight_in_lbs`가 `[1, 8]` concrete
stroke-width range에 mapping되고, 오른쪽 범례는 같은 resolved scale에서 5개 sample을 그린다.

## Grain과 lifecycle 계약

- Rule: final semantic item마다 하나의 field 값을 읽어 concrete `strokeWidth`를 만든다.
- Line: final series마다 하나의 field 값만 허용한다. 같은 series 안의 값이 서로 다르면 집계하거나 첫 값을
  선택하지 않고 명시 오류를 낸다.
- Field와 explicit domain은 non-negative finite number만 허용한다.
- `strokeWidth` scale은 point `size` scale과 공유하지 않는다.
- `editScale({ scale: "strokeWidth", ... })`는 owning mark와 sampled legend를 함께 갱신한다.
- Field variant를 rule constant variant로 바꾸면 semantic field encoding과 standalone legend를 제거한다.
- 기존 `encodeStrokeWidth({ value })` 호출은 호환된다. Constant variant는 계속 rule 전용이다.
- 현재 standalone stroke-width legend는 right position과 create/remove/scale-edit lifecycle을 지원한다.
  지원하지 않는 세부 `editLegend` 요청은 silent failure 대신 범위가 명확한 오류를 낸다.

## 검증 증거

- Focused P3-B action/legend/gate: 28/28 pass
- Full suite: 1620/1620 pass
- Coverage: 94.86% lines, 90.27% branches, 98.53% functions; critical floors 55/55
- Browser Canvas: 30/30 pass
- Node render/gallery: 115/115 pass; Roadmap 4 gallery 2 variants verified
- Primitive/public P3-B programs: semantic, graphic과 Canvas calls exact equality
- Node PNG: 1040×640 physical pixels at 2x
- Package artifact: 328 entries, 286,793 packed bytes, 1,339,214 unpacked bytes
- Installed tarball consumer SHA-256:
  `5720f92cc4138dbfd58f020af5d6c95cf0524f64f0dc17820ab2be2b26cc4204`
- Installed consumer: Node, Browser, PNG와 strict TypeScript including exported
  `StrokeWidthEncodingOptions` pass
- Docs source/generation: 27/27 pass. Local built-doc verification은 installed Jekyll executable 부재로
  실행하지 못했으며 source links, images, signatures, capabilities와 LLM references는 통과했다.

## 검토 이미지

- Primitive: `.artifacts/test/png/roadmap4/field-stroke-width/cars-weighted-rules/field-stroke-width/primitive.png`
- Public: `.artifacts/test/png/roadmap4/field-stroke-width/cars-weighted-rules/field-stroke-width/user-facing.png`

두 PNG는 pixel-identical이다.

## 승인 결과

2026-07-20 사용자 승인으로 STEP4 Phase 3 closeout과 P3-Exit 검증이 열렸다.
