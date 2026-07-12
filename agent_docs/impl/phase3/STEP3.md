# STEP 3 — Binned Bar `encodeX`

## 목표

Histogram progression의 raw x encoding과 x scale block을 bar용 `encodeX` Chart
API로 교체한다.

```javascript
.createBarMark({ id: "bars" })
.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 },
  scale: { nice: true, zero: false }
})
```

STEP3는 bin 의미, Cartesian coordinate, semantic x scale과 resolved x scale을
완성한다. y count/stack이 없으므로 concrete rect는 아직 materialize하지 않는다.

## 진행 상태

- [x] Bar target을 지원하는 공용 `encodeX`
- [x] `bin.maxBins` API와 validation
- [x] Histogram bin/domain resolver
- [x] `1, 2, 3, 5 × 10ⁿ` nice step
- [x] Explicit domain 우선순위
- [x] Cartesian coordinate와 semantic x scale
- [x] Resolved binned x domain/range
- [x] Incomplete bar collection materialization 유예
- [x] Histogram progression의 raw x block 교체
- [x] Unit, acceptance, PNG regression
- [x] 영어 Encoding/scale/action/LLM 문서
- [x] 전체 regression, conceptual commit, push

## API

```javascript
encodeX({
  field,
  target?,
  fieldType = "quantitative",
  coordinate?,
  bin: {
    maxBins = 10
  },
  scale: {
    id = "x",
    type = "linear",
    domain = "auto",
    range = "auto",
    nice = true,
    zero = false
  }
});
```

- `field`와 `bin`은 bar x encoding에서 필수다.
- `bin`은 plain object이며 초기에는 `maxBins`만 지원한다.
- `target`은 생략하면 `context.currentMark`를 사용한다.
- `fieldType`은 초기 bar 범위에서 `"quantitative"`만 지원한다.
- `coordinate`는 기존 layer coordinate 또는 기본 `"main"`을 사용한다.
- Bar x scale은 `linear`만 지원한다.
- Unknown option과 unsupported 조합은 state 변경 전에 오류다.
- Point/line `encodeX`의 기존 signature와 동작은 유지한다.

## Action 구조

```text
encodeX(...)
├─ createCoordinate(main, cartesian, layers = [bars])
├─ editSemantic(layer[bars].encoding.x.field = Displacement)
├─ editSemantic(layer[bars].encoding.x.fieldType = quantitative)
├─ editSemantic(layer[bars].encoding.x.bin.maxBins = 10)
├─ editSemantic(layer[bars].encoding.x.scale = x)
├─ createScale(x, linear, auto, auto, nice = true, zero = false)
└─ rematerializeScale(x)
   ├─ quantitative values 읽기
   ├─ binned domain resolve
   ├─ graphical x range resolve
   ├─ resolved scale 저장
   └─ rect materialization 유예
```

저장되는 semantic state:

```javascript
{
  coordinate: "main",
  encoding: {
    x: {
      field: "Displacement",
      fieldType: "quantitative",
      bin: { maxBins: 10 },
      scale: "x"
    }
  }
}
```

```javascript
{
  id: "x",
  type: "linear",
  domain: "auto",
  range: "auto",
  nice: true,
  zero: false
}
```

## Bin과 domain 규칙

Automatic domain은 다음 순서로 계산한다.

```text
finite field extent
→ zero 적용 여부
→ maxBins를 넘지 않는 nice step 선택
→ step 배수로 start/stop 확장
→ bin boundary domain 확정
```

Nice step 후보는 다음과 같다.

```text
1, 2, 3, 5 × 10ⁿ
```

정렬된 start/stop으로 인해 bin 수가 `maxBins`를 넘으면 다음 큰 후보를 선택한다.
Cars 데이터의 결과는 다음과 같다.

```javascript
resolvedScales.x = {
  type: "linear",
  domain: [50, 500],
  range: [80, 372]
};
```

Explicit domain 규칙:

- Explicit domain은 `nice`와 `zero`보다 우선하며 확장하지 않는다.
- Explicit binned domain은 두 개의 finite ascending value여야 한다.
- Explicit domain 또는 `nice: false` domain은 전체 span을 `maxBins`개의 동일한
  interval로 나눈다.
- Explicit range는 그대로 사용한다.
- Automatic range는 현재 Canvas plot bounds에서 추론한다.
- Constant automatic extent는 하나의 finite-width bin으로 확장한다.
- Automatic domain은 적어도 하나의 finite field value가 필요하다.

STEP3에서는 bin instruction과 resolved domain만 저장한다. Bin별 count나 concrete
boundary object를 semanticSpec 또는 graphicSpec에 추가하지 않는다.

## Scale materialization 경계

기존 point consumer는 row마다 하나의 graphical child가 있으므로 raw field value를
x/y로 mapping한다. Binned bar는 row 수와 rect 수가 다르므로 같은 방식으로 mapping
하면 안 된다.

```text
point scale  -> row value를 기존 circle x/y에 mapping
line x only  -> resolved scale 저장, path materialization 유예
bar x only   -> resolved binned scale 저장, rect materialization 유예
```

`rematerializeScale`은 binned bar consumer를 발견하면 raw values를 rect property로
쓰지 않는다. STEP4의 bar materialization이 x/y encoding을 함께 읽어 rect 개수와
concrete geometry를 만든다.

초기 범위에서는 binned bar scale을 unbinned mark와 공유하거나 서로 다른
`maxBins`를 가진 bar들이 공유하면 오류다. 사용자는 명시적인 scale ID로 독립 scale을
만들 수 있다.

## Progression program

STEP1 primitive와 STEP2 `createBarMark` progression은 보존한다. 기존
`carsHistogramEncodings.js`에서 raw x block만 교체한다.

교체 전:

```text
editSemantic(x.field)
editSemantic(x.fieldType)
editSemantic(x.bin.maxBins)
editSemantic(x.scale)
editSemantic(scale[x].type/domain/range/nice/zero)
```

교체 후:

```javascript
.createCanvas(...)
.createData(...)
.createBarMark({ id: "bars" })
.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 },
  scale: { nice: true, zero: false }
})
```

Raw y/color semantics, rect values, grid, axes, legend와 title은 그대로 유지한다.
Fixture가 적용하는 최종 graphical objects는 STEP2와 같아야 한다.

## 구현 순서

1. Bin option과 bar x 조합 validation을 추가한다.
2. Deterministic histogram bin/domain resolver를 core에 구현한다.
3. `encodeX` target 해석과 semantic edits를 bar로 확장한다.
4. Bar scale default와 explicit domain/range 우선순위를 구현한다.
5. `rematerializeScale`이 binned domain을 resolve하고 rect edit를 유예하게 한다.
6. Unit test로 defaults, explicit options, trace, 오류, immutability를 검증한다.
7. Progression의 raw x encoding/scale block을 `encodeX`로 교체한다.
8. Acceptance test로 semantic, resolved scale, graphical 결과와 action order를 고정한다.
9. PNG를 생성해 STEP2 geometry가 유지되는지 직접 확인한다.
10. 영어 public/LLM 문서를 갱신하고 전체 regression을 실행한다.

## 제외 범위

- Bar `encodeY`, count와 zero-stack
- Rect cardinality와 concrete geometry 자동 materialization
- Bar color grouping과 fill materialization
- Histogram axis tick 계산 변경
- Grid, legend, title high-level action
- Shared binned/unbinned scale 및 서로 다른 bin policy 병합

## 완료 조건

- `createBarMark().encodeX()`가 raw x semantic path 없이 호출된다.
- Semantic x encoding에 field, fieldType, bin, scale reference가 저장된다.
- Semantic x scale에 default/inferred policy가 저장된다.
- Resolved scale에 `[50, 500]` domain과 `[80, 372]` range가 저장된다.
- `encodeX` 직후 bar rect collection은 비어 있다.
- Progression의 최종 semantic/graphical histogram 결과가 유지된다.
- `createCanvas`, `createData`, `createBarMark`, `encodeX`가 연속해서 읽힌다.
- 기존 point/line encoding과 Phase 1/2 결과가 유지된다.
- 관련 public/LLM 문서와 test가 통과한다.
- 변경이 하나의 conceptual commit으로 push된다.

## 검증 결과

- Unit/acceptance: 230 tests passed
- PNG regression: 7 tests passed
- Cars binned x: domain `[50, 500]`, range `[80, 372]`
- `encodeX` 직후 empty rect collection 유지
- Progression의 semantic/graphical histogram 결과 유지
- 직접 확인: STEP2와 동일한 geometry와 raw grid overlay 유지
