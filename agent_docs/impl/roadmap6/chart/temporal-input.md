# Temporal input의 명시적 단위

## 차트와 승인할 결과

입력은 같은 두 원본 행 `[{time:1000,value:1},{time:2000,value:2}]`다. X의 입력 단위만 바꾼다.
760×420 logical pixels, pixelRatio 2, Y domain [0,3], X nice:false를 사용한다.

| Variant | Public temporalUnit | X domain | UTC labels |
| --- | --- | --- | --- |
| timestamp | timestamp | [1000,2000] | 00:00:01, 00:00:02 |
| year | year | [-30610224000000,946684800000] | 1000, 2000 |
| auto | auto | year와 같음 | 1000, 2000 |

두 점의 화면상 위치는 같다. 같은 raw 숫자가 표현하는 시간 간격은 timestamp에서 1초, year/auto에서
1,000년이다. Auto는 기존 숫자 연도 추론의 보존을 보여 준다. Unix seconds를 자동 추론하지 않는다.

## 최종 public API와 계층

정확한 옵션·tick values·title을 포함한 세 chain은 [단일 manifest](../../../../test/charts/temporal-input/manifest.js)의
`targetCall()`에 있다. [검토 생성기](../phase2/render-review.mjs)는 이미지를 해당 chain과 함께 표시한다.

```javascript
chart()
  .createCanvas({
  "width": 760,
  "height": 420,
  "margin": {
    "top": 88,
    "right": 100,
    "bottom": 85,
    "left": 100
  }
})
  .createData({ values: [{ time: 1000, value: 1 }, { time: 2000, value: 2 }] })
  .createScatterPlot({
  "id": "events",
  "x": {
    "field": "time",
    "fieldType": "temporal",
    "temporalUnit": "timestamp",
    "scale": {
      "nice": false
    }
  },
  "y": {
    "field": "value",
    "scale": {
      "domain": [
        0,
        3
      ],
      "nice": false,
      "zero": false
    }
  },
  "point": {
    "fill": "#2563eb"
  },
  "guides": {
    "axes": {
      "x": {
        "ticksAndLabels": {
          "values": [
            1000,
            2000
          ]
        },
        "title": {
          "text": "Time (UTC)"
        }
      },
      "y": {
        "ticksAndLabels": {
          "values": [
            0,
            1,
            2,
            3
          ]
        },
        "title": {
          "text": "Value"
        }
      }
    },
    "legend": false
  }
})
  .createTitle({
  "text": "1000 and 2000 as Unix milliseconds",
  "subtitle": "1970-01-01 UTC · one second apart",
  "titleStyle": {
    "fontSize": 20
  },
  "subtitleStyle": {
    "fontSize": 13
  }
});
```

H0 createScatterPlot → createPointMark/encodeX/encodeY → 공통 temporal parser → scale/geometry → guides다.
`temporalUnit`은 facade가 별도 계산하는 값이 아니라 기존 temporal binding vocabulary로 내려간다.

## 저장 의미와 primitive의 경계

구현된 public 프로그램은 `encoding.x.temporalUnit`에 명시한 단위를 저장하고 원본 rows는 유지한다. 같은 binding 재할당의
생략은 저장 단위를 보존한다. 새 field/field↔datum 전환과 non-temporal 전환은 [승인된 A 계약](../phase2/CONTRACT_REVIEW.md)을 따른다.

[Primitive](../../../../test/charts/temporal-input/primitive.program.js)는 [독립 reference](../../../../test/charts/temporal-input/reference-values.js)로
계산한 ISO 문자열 컬럼을 추가해 기존 temporal parser를 사용한다. Primitive는 `temporalUnit`에 의존하지 않아
public 단위 정규화 결과와 독립적으로 비교할 수 있다. Primitive는 raw time/value도
보존한다. Public 목표의 원본 dataset에는 보조 isoTime 컬럼이 필요하지 않다.

Public 구현과 primitive의 exact graphic/draw-order/Canvas call 및 같은 실행 PNG 3개 비교를 통과했다.
Runtime unit/owner matrix는 별도 focused 테스트로 검증했다. 실제 수치는 Phase 2 RESULTS에 기록한다.

## 검증과 범위

Normal tests는 exact domain, 두 positioned points, UTC labels/ISO strings, 원본 값 보존, explicit auto/year
동등성, target JavaScript 구문과 input hash를 검사한다. PNG 3개와 source/image/pixel/call hash는
[결과](../phase2/public-visual-results.json)에 있다. 전체 temporal channel·facade·transform·Rule datum·selection의
matrix는 [Phase 2 검증](../phase2/VALIDATION.md)을 따른다. 이 두 점만으로 전체 parser 지원 완료를 주장하지 않는다.
