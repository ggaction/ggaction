# Roadmap 3 Planned Rect contract

Gate A에서 승인된 Phase 9의 아직 구현되지 않은 rect 계약이다. Directional offset과 text annotation은 구현되어
Current 계약으로 이동했다.

## Rect heatmap

```typescript
createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? }): ChartProgram;
```

- Rect uses two discrete positions or x/x2 plus y/y2 ranged positions and existing color encodings.
- It is a distinct semantic mark; existing bar materialization is not presented as rect ownership.
- Selection/highlight operates at final cell grain and optional text is a separate text layer.
- Status: Planned, NOT IMPLEMENTED. Roadmap 3 Phase 9.
