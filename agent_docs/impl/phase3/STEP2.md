# STEP 2 — Bar Mark Action

## 목표

Primitive histogram의 raw bar 생성 구간을 `createBarMark` Chart API로 교체한다.

```javascript
.createData({ id: "cars", values: cars })
.createBarMark({ id: "bars" })
```

Action은 semantic `bar` mark와 dataset reference를 저장하고, 아직 cardinality가
결정되지 않은 빈 graphical `rect` collection을 생성한다.

## 진행 상태

- [ ] `createBarMark` API와 option validation
- [ ] Dataset/currentData 추론
- [ ] Semantic bar mark와 data reference
- [ ] 빈 graphical rect collection
- [ ] Duplicate/conflict validation
- [ ] Nested trace와 immutability test
- [ ] 별도 histogram progression program의 raw mark block 교체
- [ ] Primitive/action progression acceptance와 PNG regression
- [ ] 영어 Mark API, action reference, `llms.txt`
- [ ] 전체 regression, conceptual commit, push

## API

```javascript
createBarMark({
  id,
  data?
});
```

- `id`는 필수 user-defined mark ID다.
- `data`는 기존 dataset ID다.
- `data`를 생략하면 `context.currentData`를 사용하며, 없으면 오류다.
- `id`, `data` 이외 option은 거절한다.
- 선택한 dataset은 실제로 존재해야 한다.
- 동일 layer ID 또는 graphic ID가 존재하면 충돌 오류다.
- Coordinate는 mark 생성에 필요하지 않으며 STEP3의 positional encoding이 소유한다.

## Action 분해

```text
createBarMark({ id: "bars", data: "cars" })
├─ editSemantic(layer[bars].mark.type = bar)
├─ editSemantic(layer[bars].data = cars)
└─ createGraphics(bars, rect, length = 0)
```

저장 결과:

```javascript
semanticSpec.layers = [
  {
    id: "bars",
    mark: { type: "bar" },
    data: "cars"
  }
];

graphicSpec.objects.bars = {
  type: "rect",
  children: []
};
```

## Cardinality 책임

`createBarMark` 시점에는 bin, aggregate, stack이 없으므로 rect 개수를 추론할 수
없다.

```text
createBarMark       -> 빈 rect collection
encodeX(bin)        -> bin 의미와 x scale
encodeY(count)      -> count/stack 의미
bar materialization -> bin × category cardinality와 concrete rect
```

따라서 STEP2에서는 fixture가 계산한 rect 수를 primitive `editGraphics(length)`로
적용한다. 이 임시 편집은 이후 histogram materialization action으로 교체한다.

## Progression program

STEP1의 primitive program과 test는 변경하지 않는다. 이를 복사한 다음 progression
program에서 raw bar 생성만 교체한다.

```text
carsHistogramPrimitives.js  # STEP1 contract, 계속 보존
carsHistogramEncodings.js   # STEP2부터 high-level action을 누적 적용
```

교체 전:

```text
editSemantic(mark.type = bar)
editSemantic(data = cars)
createGraphics(bars, rect, length = fixture rect count)
```

교체 후:

```text
createBarMark({ id: "bars" })
editGraphics(bars.length = fixture rect count)
editGraphics(bars concrete properties)
```

`createGraphics`는 생성 순서대로 render order에 추가한다. STEP2의 raw horizontal
grid는 `createBarMark`보다 먼저 생성하여 다음 순서를 유지한다.

```text
canvas -> horizontalGridLines -> bars -> axes -> legend -> title
```

최종 `createGrid` action은 이후 단계에서 mark보다 뒤에 보이도록 graphical order를
직접 책임진다.

## 구현 순서

1. Bar mark option, ID, dataset validation을 구현한다.
2. `createBarMark`를 wrapped action으로 등록한다.
3. Semantic bar와 빈 rect collection을 unit test한다.
4. Default inference, invalid input, duplicate, trace, immutability를 검증한다.
5. Primitive program/test를 복사해 progression program/test를 만든다.
6. Raw grid를 먼저 생성하고 raw mark block을 `createBarMark`로 교체한다.
7. Fixture rect count와 concrete properties를 primitive edit로 적용한다.
8. 두 progression의 semantic/graphic 결과가 동일한지 acceptance test한다.
9. 두 PNG를 모두 생성하고 직접 확인한다.
10. 영어 public/LLM 문서를 갱신하고 전체 regression을 실행한다.

## 제외 범위

- Binning과 bin cardinality 추론
- Bar용 `encodeX`와 `encodeY`
- Count/stack 계산
- Rect materialization과 rematerialization
- Bar color encoding
- High-level grid, axes, legend action 변경

## 완료 조건

- 사용자가 raw mark/data semantic path 없이 bar mark를 생성한다.
- Action 직후 semantic bar와 빈 rect collection이 존재한다.
- Trace에 세 wrapped child action이 기록된다.
- Primitive histogram program/test는 수정되지 않는다.
- Progression program은 STEP1과 동일한 최종 semantic/graphic 결과를 만든다.
- Grid가 bars보다 먼저 렌더링된다.
- 관련 public/LLM 문서가 현재 API와 일치한다.
- 전체 test와 두 histogram PNG regression이 통과한다.
- 변경이 하나의 conceptual commit으로 push된다.
