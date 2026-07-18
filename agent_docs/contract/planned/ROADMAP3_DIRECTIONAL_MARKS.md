# Roadmap 3 Planned Directional, Text and Rect contracts

Gate A에서 승인된 Phase 9의 아직 구현되지 않은 text와 rect 계약이다. Directional offset은 구현되어 Current
`ENCODINGS.md`로 이동했다.

## Text annotation

```typescript
createTextMark({ id?, data?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? }): ChartProgram;
encodeText({ target?, field?, value?, format? }): ChartProgram;
editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? }): ChartProgram;
```

- Text accepts exactly one field/value content source, inherited or explicit position, deterministic formatting and
  graphical offsets.
- Scatter labels, bar values and rule annotations use the same semantic mark; tooltip/interaction is excluded.
- Concrete text stores final content, x/y, typography, alignment and rotation.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 9.

## Rect heatmap

```typescript
createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
```

- Rect uses two discrete positions or x/x2 plus y/y2 ranged positions and existing color encodings.
- It is a distinct semantic mark; existing bar materialization is not presented as rect ownership.
- Selection/highlight operates at final cell grain and optional text is a separate text layer.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 9.
