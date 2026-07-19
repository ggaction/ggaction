# Basic Pre-gridded Heatmap

## 목적

이미 x/y/color 값이 한 row에 존재하는 cell dataset을 rect heatmap으로 만든다.

## 후보 API

```javascript
program.createHeatmap({
  id?, data?, coordinate?,
  x, y, color,
  rect?: { opacity?, stroke?, strokeWidth? },
  guides?: false | CreateGuidesOptions
});
```

- `x`, `y`: rect-compatible field string 또는 position option.
- `color`: required field string 또는 `ColorEncodingOptions`. Numeric continuous color는
  `{ field, fieldType: "quantitative", scale }`로 명시한다.
- Missing x/y combinations은 placeholder cell로 만들지 않는다.
- Cell fill은 required `color` encoding이 유일하게 소유한다. `rect.fill`은 항상 충돌하므로 P2-D 구현 전에
  P2-A 후보에서 제거했으며, 이 보정은 2026-07-20 사용자 승인을 받았다.
- Automatic text label은 이 facade 범위가 아니다. 필요한 경우 뒤에 `createTextMark().encodeText()`를 체이닝한다.
- Binned raw rows는 Phase 5의 `createBin2DData`가 소유한다.

## Shortest chain과 hierarchy

```javascript
program.createHeatmap({
  x: { field: "year", fieldType: "ordinal" },
  y: { field: "country", fieldType: "nominal" },
  color: { field: "life_expect", fieldType: "quantitative" }
});
```

`createRectMark → encodeX → encodeY → encodeColor → createGuides` 순서다.

## 저장 결과와 오류

별도 heatmap state는 없다. Rect layer와 three encodings/scales/guides만 남는다. Continuous color intent가
불명확한 string에는 current nominal default를 적용하므로 quantitative intent는 object로 명시해야 한다.
