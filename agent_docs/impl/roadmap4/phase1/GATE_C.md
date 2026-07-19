# P1-C — B-004 Quantitative Line Position Order

## 진행 상태

- [x] 외부 x→y 실패와 y→x 성공 재현
- [x] quantitative x partial state 허용
- [x] x→y와 y→x final state 동등성
- [x] grouped direct line
- [x] temporal aggregate와 Polar line 회귀
- [x] invalid aggregate completion과 immutability
- [x] Browser Canvas와 Node PNG
- [x] 전체 test suite
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-19)

## 승인할 executable chain

```javascript
const program = chart()
  .createCanvas({
    width: 400,
    height: 300,
    margin: { top: 30, right: 30, bottom: 46, left: 52 }
  })
  .createData({ values: [
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 3 },
    { x: 4, y: 8 }
  ] })
  .createLineMark({ id: "line", strokeWidth: 3 })
  .encodeX({ field: "x", fieldType: "quantitative" })
  .encodeY({ field: "y", fieldType: "quantitative" })
  .createGuides();
```

`encodeX` 직후에는 x semantic과 scale만 저장되고 path collection은 비어 있다. `encodeY`가
compatible direct quantitative pair를 완성하면 4-command path를 materialize한다.

## 승인할 동등성

```javascript
base.encodeX({ field: "x" }).encodeY({ field: "y" });
base.encodeY({ field: "y" }).encodeX({ field: "x" });
```

두 결과는 다음이 같다.

- line layer semantics
- scale resources를 ID로 정규화한 semantic set
- resolved scales
- complete `graphicSpec`과 render calls
- grouped line의 series topology

Scale 배열의 생성 순서는 action history를 보존하므로 각각 `[x, y]`, `[y, x]`다. Scale ID와
해석 결과는 동일하며 이 Gate에서는 전역 semantic resource ordering을 변경하지 않는다.

## invalid completion

Quantitative x partial 뒤에 aggregate y를 붙이면 direct line을 aggregate line으로 재해석하지 않는다.
Aggregate line은 기존처럼 temporal x가 필요하며, 오류 시 이전 partial program은 바뀌지 않는다.

## 검증 증거

- 회귀: `test/contracts/line-position-order.test.js`
- Aggregate line: `test/unit/actions/encodings/aggregate-line-y-encoding.test.js`
- Group/color/dash: `test/unit/actions/encodings/line-series-encodings.test.js`
- Polar: `test/unit/actions/marks/polar-line-mark.test.js`
- focused and family regression: 36/36 통과
- cumulative suite: 1559/1559 통과
- Browser Canvas: one move and one line call in the minimal two-row reproduction
- Node PNG: 2x physical output과 non-empty buffer 검증

## 호환성과 문서 영향

- Public action signature와 TypeScript declaration 변경 없음
- Existing temporal aggregate and derived line behavior 유지
- Phase 15에서 quantitative direct line의 양방향 position authoring을 예제로 고정

## 승인 후

P1-Exit의 세 finding 누적 재현, coverage, package check와 package consumer 검증을 시작한다.
