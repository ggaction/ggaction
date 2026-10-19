# 마크의 backdrop으로 축·플롯 테두리 사용

## 진행 상태

- [x] #223의 기존 공개 재현·현재 ownership/그리기 순서 구현 확인
- [x] 기존 defaults와 grid rank를 유지하는 최소 공개 설계 확정
- [x] 기존 primitive만으로 독립적인 목표와 수치·renderer 증거 준비
- [ ] 검토 commit/push 후 직접적인 standing approval 재사용 기록
- [ ] 구현·타입·현재 계약·예제·문서·패키지와 전체 검증
- [ ] 검증 checkpoint commit/push; 다음 정기 릴리즈까지 candidate 유지

이슈: <https://github.com/ggaction/ggaction/issues/223>.
이 본문은 구현 전 설계다. 아직 새 공개 옵션이나 primitive 편집을 구현하지 않는다.
학교 모델 호출은0이며 source1694 번역을 이 gap을 통해 승인하지 않는다.

## 범위와 공개 입력

기존 `createXAxis/createYAxis`, `editXAxis/editYAxis`에 `underlay?: boolean`을 추가한다.
Complete-axis option을 재사용하는 `createAxes`, guides와 chart facade에도 동일하게 전달된다.
이름 있는 축은 기존 `id`/`target` selector를 그대로 사용한다. 축 부분 생성/편집에는 별도 옵션을
만들지 않는다. 먼저 완성된 축을 선언하고 전체 축의 배치를 편집하는 흐름이다.

기존 Full/Basic Canvas의 `plotBorder` object에도 `underlay?: boolean`을 추가한다.

```js
unit
  .editCanvas({ plotBorder: { underlay: true } })
  .editXAxis({ underlay: true });
```

- 기본 false/생략의 기존 출력과 저장 형태는 유지한다.
- 축 편집의 생략/undefined는 현재 정책을 보존하고 false는 optional intent를 제거한다.
- Border는 기존 object-replacement 규칙을 따른다. 명시적인 새 object에서 생략/false는 기본 overlay다.
  Canvas width/margin 등만 편집하면 기존 border object와 정책을 보존한다.
- Boolean 외의 null/숫자/문자열은 거부한다. 새 직접 action이나 전역적인 숫자 rank를 추가하지 않는다.
- 기존 grid `zIndex`는 그대로 유지한다. 이 값은 grid끼리의 rank와 mark 앞/뒤를 정의한다.
  축까지 비교 가능한 전역 rank로 확장하면 요청하지 않은 guide 간 우선순위 계약이 필요하다.
  이 이슈의 요구는 축/테두리를 마크 전에 두는 명시적인 Boolean 선택으로 충족한다.
- Axis 옵션은 기존 Cartesian 축의 범위를 따른다. Polar/Parallel 축에 새 옵션을 유입하지 않는다.
  Canvas border는 기존 coordinate 범위를 유지하며 같은 concrete plot container 안에서 이동한다.

## 저장과 최소 primitive 편집

- 축 intent는 기존 `materializationConfigs.guides.axis[id].frame.underlay?: true` 한 곳에 저장한다.
  기존 offset과 patch 병합하며 어느 편집도 상대 field를 지우지 않는다. 마지막 optional field가
  제거되면 빈 frame을 남기지 않는다. Renderers와 semantic guide에는 복제하지 않는다.
- Border intent는 기존 `materializationConfigs.canvas.plotBorder.underlay?: true`다.
- 실제 drawing order는 기존 `graphicSpec.objects[container].children`만 소유한다.
- 기존 `editGraphics({target, property:"children", value: orderedIds})`를 확장해 named Canvas/collection의
  **기존 직접 자식 ID의 정확한 순열**만 편집하게 한다. 현재 root order나 parent/ID/content/clip/items를
  바꾸는 API는 추가하지 않는다. Generated item, 누락/추가/중복/다른 parent/비문자열은 원자적으로 거부한다.
  빈 container의 빈 순열과 동일 순열은 정상적인 property edit다. Caller array/이전 프로그램을 변경하지 않는다.
- 기존 primitive로 노드를 삭제·재생성하면 object 선언 순서와 SVG resource namespace가 바뀌고
  불필요한 geometry 복제가 생긴다. 위 순열 편집은 현재 그리기 순서만 바꾸는 데 필요한 최소 확장이다.
  일반 chart 번역의 추천 어휘로 primitive를 넣지는 않는다.

## 명시적 materialization

순수 child-order 계산은 기존 graphic-tree/axis resource selector와 하나의 draw-order owner를 사용한다.
새 internal wrapped `rematerializePlotDrawOrder`가 계산한 순열을 `editGraphics` child로 적용한다.
Renderer가 guide intent를 읽거나 자동 compiler를 만들지 않는다.

새 옵션이 있는 unit 또는 명시적으로 옵션을 해제하는 transaction만 이 reconciliation을 실행한다.
기존 옵션을 전혀 사용하지 않은 프로그램은 기존 코드 경로와 출력을 그대로 유지한다.

활성화한 차트의 순서는 다음과 같다.

1. nonpositive Cartesian grid: 기존 rank와 horizontal/vertical tie 순서 유지
2. underlay border, underlay axes: border 다음 축 owner의 기존 의미 순서, owner 내부 component 순서 유지
3. ordinary mark와 나머지 비소유 그래픽: 서로의 현재 순서 유지 (회귀 band/line, labels 포함)
4. positive Cartesian grid: 기존 rank 순서 유지
5. overlay border와 axes: 기존 border-before-axis 계약, 축 owner/component 순서 유지

노드의 부모·property·items·clip·크기·좌표·resource ID·object 선언 순서는 바꾸지 않는다.
명시적인 raw extension 배치가 domain guide를 가로지르는 경우 domain의 요청된 mark-relative 배치가
해당 guide의 위치를 소유하며, 비소유 그래픽끼리의 순서는 유지한다.

Guide transaction의 명시적 마지막 단계, grid/border materialization과 mode reset을 같은 owner로 연결한다.
새 ordinary mark의 placement는 underlay guide를 overlay anchor로 오인하지 않으며 positive grid의
앞에 놓인다. Regression/통계 mark의 기존 상대 배치는 보존한다. Geometry가 바뀌지 않는 편집에도
정책이 유지되고, 새 axis component와 뒤늦게 만든 grid/border도 같은 최종 순서로 수렴한다.

Complete axis 생성·편집은 모든 component와 최종 순서를 speculative immutable branch에서 검증한다.
실패한 입력·재생·import가 이전 프로그램과 호출자 rows/options/trace를 변경하지 않는다.

## 목표와 검증

기존 #223 재현의240×180 Canvas, 동일2행·같은2개 rounded yellow difference bar와 기존 gray guide를 쓴다.
원래 `[horizontalGridLines, barPlot, plotBorder, xAxisLine]`을
`[horizontalGridLines, plotBorder, xAxisLine, barPlot]`로 바꾸는 독립적인 literal primitive를 만든다.
순서 외의 전체 graphic object·source row·mark bounds/paint·축/테두리 속성은 정확히 같다.
불투명 yellow가 #888 axis와 만나는 안쪽 pixel은 difference 연산으로RGB119,119,136이어야 한다.
기존 overlay control은RGB136,136,136이다. 곡선/경계 antialias pixel은 이 수치 probe에 쓰지 않는다.

- 첫 source/target에서 SVG·Node PNG·DPR2·PDF raster·plot ink를 자동 검사하고 차트 pixels를 눈으로 보지 않는다.
- Public API와 literal primitive는 exact graphic tree/order/default SVG/renderer calls/같은 실행 decoded pixels가 같다.
- 모든93개 기존 공개 예제의 default semantic/config/graphic/SVG를 이 변경 전 commit과 정확히 비교한다.
- Pure order/primitive 순열 경계, overlay/underlay 단독·결합·reset, 생성/편집 순서, named/standalone축,
  grid rank·늦은 grid/mark 추가·geometry/style/scale/data/theme/textMetrics/Canvas/facet source replay를 검증한다.
- 기존 Cartesian mark vocabulary, partial axis/remove, facet outer guides/concat/nested snapshots와 editable
  persistence, Full/Basic·브라우저안전·정확한tarball consumer를 다룬다. Renderer는 바꾸지 않는다.
- 세 브라우저 Canvas/SVG, Node PNG/PDF와 독립적인 opaque difference 산술을 따로 검증한다.
- API/current contracts/internal action index/types/예제/문서/cards/LLM/images·전체 필수 suite를 동기화한다.
  실제 package/card/bundle cap 초과만 기존 최소 단위로 조정하며 수치/그림/coverage 기준은 늘리지 않는다.
- 다음 regular release는1413 families다. 현재1250완료/250남음, 공개runtime0.0.21은 유지한다.
  검증된 candidate만 commit/push하고 #223은 실제 release 통합 때까지 열어 둔다.

구체적인 목표를 원격 검토 commit에 고정한 뒤 사용자의 직접 지시
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”를
이 범위의 구체적인 public/schema/visual 결정에 재사용해 기록한다. 별도 재질문은 하지 않는다.
