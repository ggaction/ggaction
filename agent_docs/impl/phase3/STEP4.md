# STEP 4 — Count/Stack Bar `encodeY`

## 목표

Binned x가 있는 bar mark에 count/zero-stack y encoding을 추가하고 resolved y
scale을 만든다.

```javascript
.createBarMark({ id: "bars" })
.encodeX({ field: "Displacement", bin: { maxBins: 10 } })
.encodeY()
```

`encodeY`는 binned x field를 추론하고 histogram 기본값인 `count`, `stack:
"zero"`, linear y scale을 저장한다. Concrete rect materialization은 STEP5로
유예한다.

## 진행 상태

- [x] Binned bar를 지원하는 `encodeY`
- [x] x field 추론과 explicit field 일치 검증
- [x] `count`와 `stack: "zero"` semantic state
- [x] Histogram bin count resolver
- [x] Count-aware resolved y domain/range
- [x] `nice: true`, `zero: true` y scale defaults
- [x] Incomplete rect collection materialization 유예
- [x] Progression의 raw y block 교체
- [x] Unit, acceptance, PNG regression
- [x] 영어 Encoding/scale/action/LLM 문서
- [x] 전체 regression, conceptual commit, push

## API

```javascript
encodeY({
  field?,
  target?,
  fieldType = "quantitative",
  coordinate?,
  aggregate = "count",
  stack = "zero",
  scale: {
    id = "y",
    type = "linear",
    domain = "auto",
    range = "auto",
    nice = true,
    zero = true
  }
} = {});
```

- `field`는 생략하면 같은 layer의 binned x field를 사용한다.
- Explicit `field`는 초기 histogram 범위에서 x field와 같아야 한다.
- `aggregate`는 `"count"`, `stack`은 `"zero"`만 지원한다.
- Binned x encoding이 없으면 오류다.
- Point/line `encodeY`의 기존 동작은 유지한다.

## Action 구조

```text
encodeY()
├─ createCoordinate(main, cartesian, layers = [bars])
├─ editSemantic(layer[bars].encoding.y.field = Displacement)
├─ editSemantic(layer[bars].encoding.y.fieldType = quantitative)
├─ editSemantic(layer[bars].encoding.y.aggregate = count)
├─ editSemantic(layer[bars].encoding.y.stack = zero)
├─ editSemantic(layer[bars].encoding.y.scale = y)
├─ createScale(y, linear, auto, auto, nice = true, zero = true)
└─ rematerializeScale(y)
   ├─ x bin boundaries resolve
   ├─ bin별 total count 계산
   ├─ count y domain과 graphical range resolve
   ├─ resolved y scale 저장
   └─ rect materialization 유예
```

## Count와 scale 규칙

- Bin은 `[start, end)`이며 마지막 bin만 end maximum을 포함한다.
- Explicit x domain 밖의 values는 count에서 제외한다.
- y domain은 category별 count가 아니라 bin별 total count를 사용한다.
- Automatic y domain은 `zero`를 적용한 뒤 `nice`를 적용한다.
- Nice step 후보는 `1, 2, 3, 5 × 10ⁿ`이다.
- Explicit y domain/range는 inferred value보다 우선한다.
- Cars 최대 bin count `104`는 y domain `[0, 120]`으로 resolve한다.
- Automatic y range는 plot bounds의 bottom-to-top `[330, 80]`이다.

STEP4는 bin counts를 derived scale input으로만 사용한다. Count rows나 bin objects를
dataset, semanticSpec 또는 graphicSpec에 저장하지 않는다.

## Materialization 경계

```text
STEP3 encodeX -> bin 의미, resolved x scale, empty rect collection
STEP4 encodeY -> count/stack 의미, resolved y scale, empty rect collection
STEP5          -> x/y를 결합한 rect cardinality와 concrete geometry
```

`rematerializeScale(y)`는 raw source values를 rect y property에 mapping하지 않는다.
Canvas 변경 시 x/y scale만 다시 resolve하며 STEP5 전에는 bars를 계속 비워 둔다.

초기 범위에서 histogram count y scale을 다른 aggregate 정책이나 unaggregated mark와
공유하면 오류다. 독립 scale은 explicit ID로 만든다.

## Progression program

`carsHistogramEncodings.js`의 raw y semantic/scale block을 `encodeY()`로 교체한다.

```javascript
.createCanvas(...)
.createData(...)
.createBarMark({ id: "bars" })
.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 },
  scale: { nice: true, zero: false }
})
.encodeY()
```

Raw color, rect values, grid, axes, legend와 title은 유지한다. Primitive contract에도
실제로 적용되던 y nice policy를 semantic `nice: true`로 명시한다.

## 구현 순서

1. Bin boundary별 total count resolver를 core에 추가한다.
2. Linear nice step에 `3 × 10ⁿ` 후보를 포함한다.
3. `encodeY`가 binned bar와 inferred field/default policy를 해석하게 한다.
4. Count/stack semantic edits와 y scale creation을 연결한다.
5. `rematerializeScale`이 count domain을 resolve하고 rect edit를 유예하게 한다.
6. Unit test로 inference, explicit options, trace, validation, immutability를 고정한다.
7. Progression의 raw y block을 `encodeY()`로 교체한다.
8. Primitive semantic contract에 y `nice: true`를 반영한다.
9. Acceptance/PNG와 public/LLM 문서를 갱신한다.
10. 전체 regression을 실행하고 결과를 기록한다.

## 제외 범위

- Rect cardinality와 x/y/width/height materialization
- Origin별 category stack segment 생성
- Bar color encoding과 fill materialization
- Histogram axis tick action 변경
- Grid, legend, title high-level action
- 서로 다른 histogram aggregate/stack 정책의 shared scale 병합

## 완료 조건

- `createBarMark().encodeX(...).encodeY()`가 raw y semantic path 없이 동작한다.
- Semantic y encoding에 inferred field, count, zero-stack, scale이 저장된다.
- Semantic y scale에 `nice: true`, `zero: true`가 저장된다.
- Cars resolved y scale이 domain `[0, 120]`, range `[330, 80]`이다.
- `encodeY` 직후 rect collection은 비어 있다.
- Progression의 최종 histogram graphical 결과가 유지된다.
- 기존 point/line encodings와 Phase 1/2 결과가 유지된다.
- 관련 public/LLM 문서와 test가 통과한다.
- 변경이 하나의 conceptual commit으로 push된다.

## 검증 결과

- Unit/acceptance: 236 tests passed
- PNG regression: 7 tests passed
- Cars count y: domain `[0, 120]`, range `[330, 80]`
- `encodeY()`의 inferred field/count/zero-stack semantic 확인
- Canvas 변경 후 x/y scale rematerialization과 empty rect collection 유지
- 직접 확인: STEP3와 동일한 histogram geometry와 raw grid overlay 유지
