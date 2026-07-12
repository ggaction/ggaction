# Phase 3 — Step 7: Bar `encodeColor`

## 진행 상태

- [x] Bar mark를 `encodeColor` target으로 허용
- [x] Histogram prerequisite 검증
- [x] Color scale domain 순서에 따른 zero stack materialization
- [x] Explicit domain의 category 누락 검증
- [x] Canvas 변경 시 colored bar rematerialization
- [x] Histogram action progression에서 raw color/rect 작성 제거
- [x] 전체 테스트와 PNG 검증
- [x] 사용자 문서 갱신

## 목표

완성된 histogram에 `encodeColor({ field })`를 적용하면 color semantic과 ordinal
scale을 저장하고, 각 bin을 category별 zero stack rect로 다시 materialize한다.

```javascript
.encodeColor({
  field: "Origin",
  scale: { palette: "tableau10" }
})
```

기존 `encodeColor` API를 그대로 사용한다. `target`은 생략하면 current mark를
사용하고, `fieldType`, scale ID/type/domain/range는 기존 기본값과 추론 규칙을
따른다.

## Action 구조

```text
encodeColor
├─ editSemantic(color field)
├─ editSemantic(color fieldType)
├─ editSemantic(color scale)
├─ createScale
└─ rematerializeBarMark
```

Bar branch는 binned x와 count/zero-stack y가 모두 있어야 한다. 불완전한
histogram에는 오류를 발생시키며 partial graphic을 만들지 않는다.

## Materialization 규칙

- Rect 순서는 bin 순서, 그 안에서는 resolved color domain 순서다.
- 각 category count는 bin의 0 기준선부터 domain 순서대로 누적한다.
- 관측값이 없는 bin/category 조합은 rect를 만들지 않는다.
- y domain은 category별 count가 아니라 기존 bin별 total count를 유지한다.
- Explicit color domain에 관측 category가 빠져 있으면 오류를 발생시킨다.
- Canvas가 변경되면 x/y/color scale과 colored rect를 명시적으로 다시 만든다.

## Progression 변경

`carsHistogramActions`는 `createBarMark`와 `encodeHistogram` 다음에
`encodeColor`를 호출한다. Color semantic, color scale, bar rect를 직접 쓰던 raw
`editSemantic`/`editGraphics` 호출은 제거한다. 아직 action이 없는 grid, axes,
legend, title의 primitive 작성은 그대로 유지한다.

## 검증

- Automatic/explicit color domain과 stack 순서 unit test
- Incomplete histogram과 explicit domain 누락 validation test
- Canvas edit rematerialization test
- 이전 primitive progression과 semantic/graphic/Canvas call equivalence test
- Node PNG와 전체 test suite 확인

검증 결과: unit/acceptance test 248개와 render test 8개가 통과했다.
