# 직접 삭제와 자동 가이드

## 진행 상태

- [x] 기존 공개 삭제/축 편집/병치 API 확인
- [x] 범례 삭제 뒤 자동 가이드 재생성 재현
- [x] 아래 추가 계약의 사용자 승인
- [x] 구현·타입·메타데이터·계약·문서·회귀 테스트

## API Gate — approved

2026-10-25 사용자 응답 “이 API로 진행”으로 아래 계약을 승인했다.
검토 기준 commit: d45ca559fcfa6b36f77063b0383a2ba358b6ed9f.

사용자는 호버 경계 상자의 삭제 버튼과 Undo/Redo, 병치 패널 삭제를 요청했다.
제목은 `removeTitle()`, 부제는 `editTitle({subtitle:false})`, 축 제목은
기존 축 편집의 `title:false`, 패널은 `removeCompositionChild({target})`를 사용한다.
이 기존 공개 계약은 변경하지 않는다.

새로 필요한 결정은 자동 가이드와 명시적 삭제의 공존이다.

```js
// suppress는 선택 옵션, 생략/false는 기존 동작
program.removeLegend({ target: "plot", channels: ["color"], suppress: true })
  .createGuides(); // 해당 mark/channel 범례를 다시 만들지 않는다.
```

- `suppress?: boolean`을 기존 `removeLegend`에 추가한다. 기본 false로 이전 호출을 보존한다.
- true는 실제 제거한 owner/channel에만 자동 생성 제외 의도를 기록한다.
  다른 범례·인코딩·데이터·축은 보존한다. channels 생략은 제거한 모든 채널에 해당한다.
- canonical replayable intent는 materializationConfigs.guides 소유이며 immutable하게 복사한다.
  삭제된 시각적 리소스 대신 빈/투명 그래픽을 남기지 않는다.
- `createGuides` 자동 범례 생성은 제외 의도를 존중한다. 명시적 `createLegend`는
  선택된 owner/channel을 다시 생성하고 그 제외 의도를 해제한다.
- facet 소스·공유 범례 및 concat의 명시적 child target에서도 같은 의미를 유지한다.
- 앱의 마지막 createGuides 호출, worker 직렬화, 코드 내보내기·프로젝트 복원도 같은 결과여야 한다.

## 확인한 기존 동작

```js
import { chart } from "ggaction";
const p = chart().createCanvas({plot:{width:260,height:260},margin:100})
  .createData({id:"data",values:[{x:1,y:2,g:"A"},{x:2,y:3,g:"B"}]})
  .createScatterPlot({id:"plot",x:"x",y:"y",color:{field:"g",fieldType:"nominal"}})
  .createGuides({legend:{target:"plot",channels:["color"]}});
const removed = p.removeLegend({target:"plot",channels:["color"]});
// p.guideConfigs.legend: color
// removed.guideConfigs.legend: empty
// 앱의 uncovered-channel 자동 suffix:
// removed.createGuides({legend:{target:"plot",channels:["color"]}}).guideConfigs.legend: color (재생성)
```

## 검증 및 문서 영향

기존 기본 동작 유지, 선택 채널만 제외, 재생성으로 해제, 다른 새 인코딩의 범례 생성,
facet/concat 및 중첩 child, 이전 프로그램 불변성, 직렬화/재생/렌더 일치 회귀를 확인한다.
RemoveLegendOptions, 액션 inspection 옵션, LEGEND_AND_TITLE 현재 계약,
공개 guide API와 생성 action/LLM reference를 함께 갱신한다.
UI에서는 실제 × 클릭 뒤 Undo/Redo와 새로고침 복원까지 확인한다.

검토 소스: 이 문서를 추가하는 Git commit. 이 Gate는 위 선택 옵션에만 적용하고,
기존 API를 이용하는 단축키·제목·패널 삭제 구현은 독립적으로 진행한다.


## 구현·검증 완료

- `guides.suppressedLegends[target].channels`가 실제 제거한 채널의 제외 intent를 소유한다.
  기존 remove 기본 동작은 유지하고 explicit createLegend가 생성한 채널만 복원한다.
- Shared/authored facet의 source snapshots, 신규 채널 추론, 명시적 복원과 스타일 보존,
  병치 child target dispatch, mark cleanup, snapshot validation을 함께 검증했다.
- 관련 guides/composition/facet/persistence 및 TypeScript/inspection 회귀 1,340개 통과.
- 공개 문서·생성 reference·선택형 LLM artifact freshness 등 문서 검사 156개 통과.
- 앱은 native removeLegend를 × 버튼에 연결하고 공유 병치 범례의 실제 owner 목록을 사용한다.
  Preview/Transition × unit/facet/concat 브라우저 검증은 앱 저장소에 유지한다.
