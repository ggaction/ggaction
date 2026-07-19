# P1-B — B-001 Layered Datum Full-Span Rule

## 진행 상태

- [x] 외부 silent-empty 최소 재현
- [x] inherited x/y provenance 저장
- [x] horizontal과 vertical datum full-span
- [x] explicit-data datum/field control
- [x] layered field interval 보존
- [x] Canvas/scale rematerialization과 immutability
- [x] Browser Canvas와 Node PNG
- [x] 전체 test suite
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-19)

## 승인할 executable chain

```javascript
const program = chart()
  .createCanvas({ width: 440, height: 320, margin: {
    top: 38, right: 32, bottom: 54, left: 62
  } })
  .createData({ values: [
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 8 }
  ] })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .createGuides()
  .createRuleMark({ id: "datum-rule" })
  .encodeY({ datum: 5, fieldType: "quantitative" })
  .encodeStroke({ value: "#dc2626" })
  .encodeStrokeWidth({ value: 2 });
```

## 승인할 semantic 결과

```javascript
{
  id: "datum-rule",
  mark: { type: "rule" },
  data: "data",
  coordinate: "main",
  encoding: {
    y: { datum: 5, fieldType: "quantitative", scale: "y" }
  }
}
```

Point에서 상속되었던 x는 사용자가 작성한 endpoint가 아니므로 제거된다. Concrete rule은 plot
bounds `x1=62`에서 `x2=408`까지 y=5 위치를 가로지른다. 반대 방향 `encodeX({ datum })`도 같은
대칭 계약을 사용한다.

## 보존할 interval 계약

- Explicit `data`를 지정한 rule에는 inheritance provenance가 없으며 기존 동작을 유지한다.
- Field endpoint는 반대 inherited primary position을 제거하지 않는다.
- 따라서 `createRuleMark().encodeY({ field }).encodeY2(...)`는 inherited x를 사용해 vertical
  interval을 완성한다.
- 직접 작성된 opposite endpoint는 datum cleanup 대상이 아니다.

## 검증 증거

- 회귀: `test/contracts/rule-inherited-datum-span.test.js`
- Rule endpoint: `test/unit/actions/encodings/rule-position-encodings.test.js`
- Layer inheritance: `test/unit/actions/marks/layered-mark-inference.test.js`
- Error bar/band 호환 targeted suite: 41/41 통과
- B-001 focused regression: 6/6 통과
- cumulative suite: 1553/1553 통과
- Browser Canvas: `[20, 90] → [220, 90]` concrete line
- Node PNG: 2x physical output과 non-empty buffer 검증

## 호환성과 문서 영향

- Public action signature와 TypeScript declaration 변경 없음
- 기존 explicit-data, direct endpoints와 field intervals 유지
- Internal mark config에 inheritance provenance가 추가됨
- Phase 15에서 datum full-span과 layered inheritance precedence를 public docs에 명시

## 승인 후

P1-C의 B-004 quantitative line x/y action-order 수정을 시작한다.
