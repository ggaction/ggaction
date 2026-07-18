# Annotated IMDb Scatterplot

## 차트 목표

IMDb reference dataset에서 complete year/rating/title 값을 가진 representative films를 point로 표시하고 제목을
text layer로 annotation한다. 긴 text, explicit graphical offset과 inherited Cartesian position을 검증한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 64, right: 130, bottom: 66, left: 70 }
  })
  .createData({ values: rows })
  .createPointMark()
  .encodeX({ field: "Released_Year", fieldType: "temporal" })
  .encodeY({ field: "IMDB_Rating", scale: { nice: true, zero: false } })
  .encodeRadius({ value: 3.5 })
  .createTextMark({
    fontSize: 10,
    fill: "#334155",
    dx: 7,
    dy: -6,
    align: "left",
    baseline: "bottom"
  })
  .encodeText({ field: "Series_Title" })
  .createGuides({
    axes: {
      x: { title: { text: "Released Year" } },
      y: { title: { text: "IMDb Rating" } }
    }
  })
  .createTitle({ text: "Selected Highly Rated Films", align: "center" });
```

## Action hierarchy와 stored result

`createTextMark`는 current compatible point layer의 data, coordinate와 x/y encodings를 persisted semantic state로
상속한다. `encodeText`는 field content source를 저장하고 text materializer가 final string과 position을 concrete
text items로 만든다. `editTextMark`는 typography와 graphical offset을 변경하고 current data/scale 결과로 전체 text
collection을 rematerialize한다.

Gate J-B는 representative label placement와 typography를 승인한다. Automatic collision avoidance, tooltip과 interaction은
범위 밖이다.
