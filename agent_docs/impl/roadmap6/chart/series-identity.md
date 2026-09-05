# Series identity와 appearance의 독립성

## 차트와 승인된 결과

프랑스·독일·일본·한국 각각 period 1–4의 4개 관측치다. Europe/Asia 두 대륙이 두 색을 제공해도
나라 4개는 각각 독립된 path다. Projection variant는 같은 관측에 +3을 적용한 별도 scenario를 추가한다.

| Variant | Identity | Appearance | 기대 결과 |
| --- | --- | --- | --- |
| country-color | country | continent color | 4 paths, 각 4개 원본 행, 2색 |
| tuple-color-dash | country + scenario | continent color, scenario dash | 8 paths, 실선 observed/점선 projection |
| series-appearance | country | continent color, weight width, quality opacity | 4 paths; width 2/4/6/8, opacity .25/.5/.75/1 |

Canvas는 760×460 logical pixels, PNG는 pixelRatio 2다. X domain [1,4], Y domain [0,28], nice/zero는 false다.
색 범례는 continent만 설명한다. Scenario dash와 width/opacity의 대응은 subtitle 및 fixture의 값에 명시한다.
서로 다른 필드를 하나의 결합 범례로 병합하는 새 계약은 이 검토에 넣지 않는다.

## 최종 public API와 계층

정확한 여섯 검토 variant 중 이 차트의 세 호출은 [단일 manifest](../../../../test/charts/series-identity/manifest.js)의
`targetCall()`이 소유한다. [검토 생성기](../phase2/render-review.mjs)가 해당 string을 이미지 옆에 그대로 표시한다.
`rows`는 [fixture](../../../../test/charts/series-identity/fixture.js)의 해당 case.rows다.

```javascript
chart()
  .createCanvas({
  "width": 760,
  "height": 460,
  "margin": {
    "top": 88,
    "right": 172,
    "bottom": 76,
    "left": 72
  }
})
  .createData({ values: rows })
  .createLinePlot({
  "id": "series",
  "x": {
    "field": "period",
    "scale": {
      "domain": [
        1,
        4
      ],
      "nice": false,
      "zero": false
    }
  },
  "y": {
    "field": "value",
    "scale": {
      "domain": [
        0,
        28
      ],
      "nice": false,
      "zero": false
    }
  },
  "groupBy": [
    "country",
    "scenario"
  ],
  "color": {
    "field": "continent",
    "scale": {
      "domain": [
        "Europe",
        "Asia"
      ],
      "range": [
        "#2563eb",
        "#c2410c"
      ]
    }
  },
  "strokeDash": {
    "field": "scenario",
    "scale": {
      "domain": [
        "observed",
        "projection"
      ],
      "range": [
        [],
        [
          6,
          4
        ]
      ]
    }
  },
  "line": {
    "strokeWidth": 3
  },
  "guides": false
})
  .createGuides({
  "axes": {
    "x": {
      "ticksAndLabels": {
        "values": [
          1,
          2,
          3,
          4
        ]
      },
      "title": {
        "text": "Period"
      }
    },
    "y": {
      "ticksAndLabels": {
        "values": [
          0,
          7,
          14,
          21,
          28
        ]
      },
      "title": {
        "text": "Value"
      }
    }
  },
  "legend": {
    "channels": [
      "color"
    ],
    "title": "Continent"
  }
})
  .createTitle({
  "text": "Country and scenario define each path",
  "subtitle": "8 paths · solid: observed · dashed: projection",
  "titleStyle": {
    "fontSize": 20
  },
  "subtitleStyle": {
    "fontSize": 12
  }
});
```

H0 createLinePlot → createLineMark/position encoders/encodeGroup/color/dash → materialization → graphic primitives다.
Appearance variant는 groupBy:"country"를 사용하며 lower encodeStrokeWidth/encodeOpacity의 field assignment를
추가한다. Facade에 새로운 strokeWidth/opacity field shorthand를 임의로 추가하지 않는다.

## 저장 의미와 primitive의 경계

Public 구현은 단일 key의 `encoding.group.field`를 보존하고 tuple은 `encoding.group.fields`에
명시적으로 저장한다. 각 최종 series에서 color/dash/width/opacity의 원본 값은 하나여야 한다. 원본 값이
여럿이면 같은 색으로 매핑되더라도 오류이며 첫 값 선택·평균·자동 분할로 해결하지 않는다.

[Primitive](../../../../test/charts/series-identity/primitive.program.js)는 현재 존재하는 position/color/guide actions로
축과 범례를 만들고, [독립 reference](../../../../test/charts/series-identity/reference-values.js)가 원본 rows로
계산한 path와 style을 명시적 editGraphics로 작성한다. 새 tuple semantic path나 Line opacity action을
호출하지 않는다. Primitive의 구형 color grouping semantic을 새로운 identity 저장 계약이라고 주장하지 않는다.

Public semantic identity/member 검사와 이 primitive의 graphicSpec·draw order·renderer calls 및 같은 실행
 decoded pixels가 모두 일치한다. Negative ambiguity·재assignment·specialized owner 경계는 runtime에서도
검증했다. [공개 프로그램](../../../../examples/series-identity/program.js)과 [tutorial](../../../../examples/series-identity/README.md)이 동일한 API 흐름을 사용한다.

## 검증과 범위

- Normal tests: 4/8 path cardinality, 원본 행의 전수·유일 membership, literal 나라 key·좌표, 증가하는 x,
  width/opacity 값, 두 색의 범례, target chain의 JavaScript 구문, input hash.
- Tuple oracle는 delimiter 및 숫자/문자열 type 충돌을 구분한다. 모호한 appearance는 oracle에서 거부한다.
- 실제 PNG 3개, plot-region ink, image/pixel/source/call hash는 [결과](../phase2/visual-results.json)에 저장한다.
- Cartesian/Polar, aggregate/bin/Area, selection/highlight/edit 소비자는 [Phase 2 검증](../phase2/VALIDATION.md)을 따른다.
  이 대표 이미지 세 장만으로 전체 consumer가 완료되었다고 하지 않는다.

현재 결과와 package 크기의 남은 제약은 [W2 결과](../phase2/RESULTS.md#w2--explicit-series-identity-and-line-appearance)에 기록했다.
