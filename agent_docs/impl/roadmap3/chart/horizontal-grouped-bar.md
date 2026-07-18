# Horizontal Grouped Bar

## 차트 목표

Jobs dataset의 `year × sex`별 `mean(perc)`를 horizontal grouped bar로 비교한다. 이 차트는 vertical grouped bar의
xOffset 의미를 yOffset으로 대칭 이동하면서 aggregate grain, group order, bar width와 legend 의미가 유지되는지를
검증한다.

## 최종 user-facing API

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 640,
    margin: { top: 82, right: 140, bottom: 72, left: 82 }
  })
  .createData({ values: rows })
  .createBarMark()
  .encodeX({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: true }
  })
  .encodeY({ field: "year", fieldType: "ordinal" })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides({
    axes: {
      x: { title: { text: "Mean workforce share", offset: 48 } },
      y: { title: { text: "Year", offset: 58 } }
    },
    grid: { horizontal: false, vertical: true },
    legend: { title: "Sex" }
  })
  .createTitle({
    text: "Workforce Share by Year and Sex",
    subtitle: "Mean occupation share in the jobs dataset",
    align: "center",
    offset: -1,
    titleStyle: { fontSize: 20, fontWeight: 700 },
    subtitleStyle: { fontSize: 12, color: "#475569" }
  });
```

`encodeColor({ layout: "group" })`는 horizontal orientation을 감지하고 wrapped `encodeYOffset({ field: "sex" })`을
호출한다. 사용자는 shortest ordinary flow에서 offset action을 직접 호출하지 않는다.

## Action hierarchy

```text
encodeColor(layout = group)
├─ encodeYOffset(field = sex)
│  ├─ createScale(yOffset)
│  ├─ editSemantic(layer[…].encoding.yOffset)
│  ├─ resolveScale(yOffset)
│  └─ rematerializeScale(yOffset)
├─ createScale(color)
├─ editSemantic(layer[…].encoding.color)
├─ resolveScale(color)
└─ rematerializeScale(color)
```

Complete grouped geometry가 생긴 뒤 bar materialization은 `year × sex` aggregate를 계산하고 resolved y/yOffset/x
scales를 final rect properties에 적용한다.

## Stored-result contract

- Bar layer는 x quantitative aggregate, y ordinal category, color nominal group과 yOffset nominal group을 저장한다.
- Color와 yOffset은 같은 field와 ordered domain을 가진다.
- `materializationConfigs.marks[barId]`는 bar width와 yOffset padding을 graphical authoring intent로 저장한다.
- Concrete rect는 top-left x/y, width/height, fill, stroke와 strokeWidth를 저장한다.
- `graphicSpec` drawing order는 vertical grid → bars → axes → legend → title이다.
- Renderer는 semantic aggregate, orientation 또는 group position을 다시 계산하지 않는다.

## Gate J-A 승인 범위

- 같은 year의 men/women bars가 하나의 category slot 안에서 분리되는가
- year와 sex의 first-appearance order가 보존되는가
- zero baseline, vertical grid, axis title과 categorical legend가 읽기 쉬운가
- chart title이 legend를 포함한 Canvas가 아니라 plot bounds를 기준으로 가운데 정렬되는가
