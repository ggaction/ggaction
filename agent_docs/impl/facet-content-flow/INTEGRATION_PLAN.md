# Content 배치 연결의 남은 계약

## 진행 상태

- [x] 순수 packing/footer kernel
- [x] 동일 guide ownership을 사용한 native child 경계 측정
- [ ] 아래 channel별 axis 정책 구현·저장·replay·type·문서
- [ ] `spacing:"content"`/header `anchor:"view"` 연결
- [ ] Native materialization, footer, title/legend/nesting 검증
- [ ] 두 원본의 독립 source/native 검증과 실제 School 번역
- [ ] 새 exact package와 문서 snapshot/현재 1,335개 호환 검사 뒤 runtime 채택

현재 native 측정까지의 내부 checkpoint다. 다음 공개 API가 이미 존재한다고 주장하지 않는다.
기존 사용자 요청의 번역에 필요한 ggaction 수정 및 in-scope 향후 질문 포괄 승인 근거는
[원래 proposal](PROPOSAL.md#승인과-범위)을 따른다. 추가적인 확인 질문은 만들지 않는다.
이미지/VLM 확인은 하지 않으며 수치·DOM·concrete graphic으로 검증한다.

## 1. Cartesian channel별 axis 정책

기존 `facet.guides.axes`와 `editFacetGuides({axes})`에 `{x?:"each"|"outer",
y?:"each"|"outer"}`를 추가한다. 새 action은 없다.

```js
// Existing point/line program with complete axes.
program.facet({field: "group", guides: {axes: {x: "outer", y: "each"}}});
```

- 기존 scalar `"each"`, `"outer"`의 출력과 저장값은 유지한다.
- Object는 알려진 x/y 중 하나 이상을 요구하며 알려지지 않은 키, 빈 object, undefined mode,
  잘못된 mode를 거부한다. Creation에서 생략한 channel은 each다.
- Editing에서 axes 전체를 생략하면 현재 정책을 유지한다. Object patch 내부의 생략된 channel은
  이전 정책을 유지하며 scalar는 양쪽 정책을 한 번에 바꾼다.
- 정규화된 object state는 x/y를 둘 다 명시한 closed object 하나다. Import는 불완전하거나
  추가 키가 있는 object state를 거부하고 정상 stored policy를 다시 materialize한다.
- 하나의 pure owner가 input normalization과 mode lookup을 소유하고 actions, persistence,
  ownership planner, native 측정이 재사용한다. Named axis는 저장된 channel과 component side로
  판단하며 ID 첫 글자나 첫 resource를 보고 추측하지 않는다.
- Outer edge는 실제 occupied row/column topology를 따른다. X outer/Y each는 아래쪽 X축과
  각 cell Y축을 유지한다. 반대 조합, top/right/mixed component, ragged/observed grid도 검증한다.
- Non-Cartesian source는 이 channel object를 거부한다. 기존 scalar each는 그대로 허용한다.
  Repeat의 기존 across-field outer 거부도 유지하며 object에 outer가 있으면 같은 이유로 거부한다.
  새로운 정책으로 서로 다른 repeated field의 축을 암묵적으로 공유하지 않는다.
- Data/scale/guide/source/theme/text metrics/layout/header edits, editable persistence, parent nesting,
  focused guide replay에서 같은 policy를 보존한다. 오류는 이전 program과 trace를 변경하지 않는다.

## 2. Content 배치

기존 facade의 opt-in `spacing:"content"`만 추가하고 기존 canvas/plot 모드는 유지한다. Mark,
실제 retained guide, 개별 header의 native 경계를 packing에 넣고 bottom shared footer는 한 번
따로 배치한다. Root Canvas 배경·제거될 guide·상위로 승격할 legend를 cell content로 재지 않는다.
Full measured body와 footer의 logical owner는 독립적인 책임이다.

새 `anchor:"view"`는 mark만 따르는 기존 content anchor와 구분하여 retained axes를 포함한
body extent에 header를 붙인다. Mark/axis geometry나 전역 text/stroke bounds 정책을 바꾸지
않는다. 여러 cell을 가로지르는 row/column role header는 개별 header로 복제하지 않고 기존
role owner와 outer reservation으로 한 번 배치해야 한다.

현재 native와 원본의 conservative logical extent 차이는 남아 있다. 실제 native 측정 없이
원본 좌표 배열을 입력하거나, source/글자/마크를 바꾸거나, 오차 한도를 늘려 통과시키지 않는다.
원본의 실제 첫 화면과 비교한 size/data/mark/text/guide/plot 오차를 source-bound 증거로 먼저
확정한다. 독립 Y축 소실을 단순 spacing 수치 조정으로 숨기지 않는다.

## 3. 완료 기준

Normal 전체 suite, focused source-neutral geometry/ownership/immutability tests, typed consumer,
설치 package/renderer/replay tests, 두 실제 source의 native/original 수치 검증을 통과해야 public
연결 checkpoint로 본다. 새 runtime 활성화는 기존 완료 family의 전체 native replay와 exact
package-source/docs 일치를 추가로 요구한다. 현재 내부 helper 검증은 그 완료 조건의 일부다.
공개 registry/GitHub/Pages 배포와 이슈 close는 다음 1,350개 릴리즈에서 별도로 검증한다.
