# Roadmap 8 기준 동작 — 0.0.16

기준 commit: `2b930177793a41a76ef3d664f3803f24d29ba67b` (`v0.0.16`).
2026-09-15 대화에서 source/type 검사와 작은 Node 실행으로 확인했다. 전체 새로운
Autocomplete 앱, 원래 추천 corpus, 대규모 p95를 검증한 기록은 아니다.

## 실행으로 확인한 사실

| ID | 실제 입력/경로 | 실제 결과 | 해석 |
| --- | --- | --- | --- |
| B01 | `g`별 y 평균 summary 뒤 사라진 x에 `filterData` gte 2 | 오류 없이 `values: []` | 필드 없음과 유효한 빈 결과를 구별하지 못함 |
| B02 | x gte 10으로 빈 dataset → Canvas가 있는 scatter, 자동 x/y domain | `Cannot infer an automatic scale domain from no values.` | 해당 생성 경로는 빈 결과를 렌더하지 못함 |
| B03 | 이미 만든 scatter에 `filterMarks({target:"p",field:"x",op:"gte",value:10})` | markFilter의 empty true, source rows 불변 | 기존 빈 mark 지원을 없다고 말하면 안 됨 |
| B04 | A=[null,2], B=[null,4], C=[null,null]의 summary | C count=2, valid=0, sum/mean/median 모두 undefined | 명세의 sum=0, mean/median=null과 정책 차이 |
| B05 | `[0,5,10,15,20,null]`, boundaries=[0,10,20]인 createBinData | null 행에서 finite number 오류 | 명세의 결측 제외/count와 정책 차이 |
| B06 | B05에서 null만 제외 | 두 bin count=2,3, 마지막 20 포함 | 경계 계산 자체는 예제와 일치 |
| B07 | 두 점 scatter → createRegression({groupBy:false,band:false}) | 최소 3행 요구 오류 | 구간 표시와 적합의 표본 조건이 분리되지 않음 |
| B08 | 세 유효 쌍과 y:null 한 행으로 createRegressionData | null 행에서 finite number 오류 | drop 정책은 별도 처리 필요 |
| B09 | x/y 점과 회귀 생성 후 점만 encodeY field z | 점 field=z, 회귀 transform y=y 유지 | fixed 정책으로는 가능하나 source-follow 의도와 다름 |
| B10 | 6행을 group partition, x/id 정렬, cumulativeSum/movingMean preceding1 | total=[2,6,12,3,8,15], mean=[2,3,5,3,4,6] | 명세 window oracle와 일치 |
| B11 | range에 minInclusive/maxInclusive 추가 | unknown property 오류 | 기존 inclusive는 양 끝을 함께 제어 |
| B12 | x gte1 → x lt3 두 filterData 연결 | x=[1,2] | 반열린 범위는 기존 조합으로 표현 가능 |
| B13 | 배열 값 xs:[1,2]를 createFoldData fields:[xs]로 처리 | primitive scalar type 오류 | fold는 배열 flatten이 아님 |
| B14 | createData values 6행의 trace | values 배열 대신 valuesCount:6 | trace가 lossless action log가 아님 |

JSON.stringify는 undefined object value를 생략한다. B04 검증 시 raw property 값 또는
명시적인 undefined sentinel로 검사해야 하며, 생략된 필드를 null로 읽으면 안 된다.

## 재현용 공통 source와 호출

아래는 0.0.16에서 호출 가능한 코드다. 실패 사례를 한 chain에 모두 넣지 말고 독립 base에서 실행한다.

```javascript
import { chart } from "ggaction";
const base = () => chart().createCanvas({
  width: 640, height: 400,
  margin: { top: 30, right: 30, bottom: 50, left: 60 }
});
const rows = ["A", "B"].flatMap((g, j) => [1, 2, 3].map((x, i) => ({
  id: j * 3 + i + 1, g, x, y: 2 * x + j, z: 3 * x + 10 + j
})));
const p = base().createData({ id: "d", values: rows });
const summary = p.createSummaryData({
  id: "s", source: "d", groupBy: "g",
  aggregates: [{ op: "mean", field: "y", as: "mean" }]
});
const invalidFieldResult = summary.filterData({
  id: "f", source: "s", field: "x", predicate: { op: "gte", value: 2 }
}); // B01: 0.0.16에서는 오류가 아니라 0행.
const scatter = p.createScatterPlot({ id: "p", data: "d", x: "x", y: "y" });
const regression = scatter.createRegression({ target: "p", groupBy: "g", band: false });
const changed = regression.encodeY({ target: "p", field: "z", fieldType: "quantitative" });
// B09: changed의 point encoding.y와 regression dataset transform.y를 각각 검사한다.
```

## 구조 검사로 확인한 근거

- [filter](../../../src/grammar/filter.js): field 문자열은 검사하지만 행에 해당 field가 있는지 평가 전에 검사하지 않는다.
- [aggregate](../../../src/grammar/aggregate.js), [summary](../../../src/grammar/summary.js): 빈 finite 집합의 undefined와 count/valid를 구분한다.
- [bin](../../../src/grammar/bin.js): finite values만 받는다.
- [regression models](../../../src/grammar/regression/models.js), [derive](../../../src/grammar/regression/derive.js): 모델/구간 및 관측 x grid 경로.
- [regression resolve](../../../src/actions/regression/resolve.js): omitted grouping은 categorical color/shape에서 추론한다.
- [data edit](../../../src/actions/data/edit.js), [revise](../../../src/actions/data/revise.js): 기존 immutable DAG/revision 재계산을 재사용할 기반.
- [action trace](../../../src/core/action.js): 배열과 함수 인자 요약.
- [persistence](../../../src/persistence.js): editable snapshot이며 앱의 session package는 아니다.
- [action card schema](../../../knowledge/action-card.schema.json): 문서형 옵션 타입과 전제조건이며 실행 가능한 조건부 UI schema는 아니다.
- [graphic types](../../../types/program.d.ts): 내장 image graphic 없음. geographic projection 계약도 내장 지원으로 확인되지 않음.

## 주장하지 않는 것

빈 결과 전체 미지원, bin 경계 전체 오계산, source revision 전체 미지원, window 미지원이라고
일반화하지 않는다. B09는 기존 계약상 fixed recipe가 유지되는 동작일 수 있으므로 새 follow 정책을
기존 동작의 무조건적인 버그 수정으로 포장하지 않는다. 원본 입력 500,000행을 허용하는 앱 정책은
모든 ggaction 변환이 그 크기에서 실행되거나 반응성 목표를 충족한다는 증거가 아니다.
