# Fashion t-SNE Polar Points

## 목적

Fashion t-SNE의 `x_pos`를 theta position, `y_pos`를 radius input, `label_name`을 color로 사용해 dense point와
negative source-domain behavior를 검증한다. Negative radius data values는 continuous domain에서 non-negative
pixel radius로 매핑되며 음수 pixel radius를 만들지 않는다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({ width: 560, height: 560, margin: 40 })
  .createData({ values: fashionRows })
  .createPointMark({ opacity: 0.42 })
  .encodeTheta({ field: "x_pos" })
  .encodeR({ field: "y_pos", scale: { zero: false } })
  .encodeColor({ field: "label_name", palette: "tableau10" })
  .encodePointRadius({ value: 1.4 });
```

## Coverage contract

- negative and positive source domains
- ten-category ordinal color mapping
- dense overplotting with constant graphical point radius
- final concrete points remain inside the available radial frame
