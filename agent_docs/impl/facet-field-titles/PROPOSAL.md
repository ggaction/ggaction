# 패싯 전체 필드 제목

## 진행 상태

- [x] 현재 공개 옵션의 제목 거부 재현 및 primitive 목표 구성
- [x] 구체 설계와 기존 일괄 승인 근거 기록
- [ ] 구현·계약·타입·문서 동기화
- [ ] 수치·불변성·재생·패키지·렌더 동등성 검증
- [ ] 로컬 후보 채택 전 기존 번역 호환성 검증

## 승인 근거

Gate 상태: **approved**. 사용자가 현재 작업에서 명시한 “지금까지 모든 질문,
앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”를 이 구체적
API·저장·시각 설계에도 재사용한다. 이는 새 목표마다 다시 질문하는 기존 지침보다
우선한다. 원본·데이터·검증은 완화하지 않는다. 이미지를 열어 보지 않는 지시를
유지하며 primitive 출력·기하·실제 디코딩 픽셀로 검증한다. 공개 배포는 다음
200개 완료 체크포인트까지 하지 않는다.

## 문제와 최소 호출

패널 값 이름과 별도로 한 필드의 제목을 전체 패싯 바깥에 한 번 표시해야 한다.
차트 제목은 별도 자원이고 가짜 축이나 임의 text mark로 대신하지 않는다.

```js
faceted.editFacetHeaders({ role: "column", title: { text: "Region" } });
```

생성 시 `headers.column.title` / grid의 `headers.row.title`에도 같은 옵션을 받는다.
새 액션은 추가하지 않는다. `title:false`는 해당 역할 제목 제거, 생략은 보존이다.
객체는 기존 제목에 부분 병합한다. 첫 생성에는 명시적 비어 있지 않은 한 줄
`text`가 필수다. 필드/반복의 이름을 임의 선택하지 않는다. 공통/all 제목은 거부한다.

## 닫힌 옵션

`text`, `fontSize`, `fontFamily`, `fontWeight`, `color`, `offset`, `align`,
`rotation`, `alongOffset`만 받는다. 한 줄 text는 줄바꿈을 거부한다. 글꼴은 해당
역할 헤더의 해석된 스타일을 상속한다. align은 기본 center이며 start/end도 지원한다.
offset은 유한 비음수, alongOffset은 유한 부호 있는 값이다. 회전은 기존 RotationInput으로
받고 유한 radians만 저장한다. 생략 회전은 top/bottom 0, left -π/2, right +π/2다.

제목은 해당 역할의 **모든 점유 plot의 합집합**을 따라 한 번 정렬한다. 바깥 기준은
plot-spacing이면 점유 plot, canvas-spacing이면 점유 child Canvas다. offset은 그 기준과
제목의 가까운 회전된 잉크 경계 사이 거리다. alongOffset은 최종 x 또는 y에 더한다.
기본 offset은 같은 쪽 헤더의 최대 두께+offset과 이미 보존된 child margin 중 큰 값+8이다.
따라서 별도 허위 여백이나 각 차트별 기본값을 만들지 않는다.

## 소유권과 검증

기존 `materializationConfigs.facets[id].headers.row|column.title` 하나에만 보관한다.
role-mode의 기존 header collection 끝에 column 제목, row 제목 순서로 concrete text를
추가한다. 렌더러와 semantic 데이터는 바꾸지 않는다. 제목 예약은 기존 외곽 cell/role
예약 및 plot-spacing child margin을 한 번만 소비하고 필요한 초과분만 부모 layout에
더한다. 제목 미지정 시 모든 기존 출력은 그대로여야 한다.

최종 제목은 Canvas, 모든 점유 plot/child Canvas, 패널 헤더, 차트 제목 및 실제 retained
축·범례 텍스트와 검사한다. 명시 위치 충돌은 원자적으로 거부하며, 순서가 달라도 같은
최종 상태면 수락/거부가 같아야 한다. 제목 제거·부분편집·source/layout/theme/textMetrics·
데이터 재생·editable persistence가 소유권을 보존한다. 저장된 잘못된 title/회전도 거부한다.

## 재현 가능한 시각 목표

`target.mjs`의 실제 primitive 목표는 Canvas **215×195**, 두 plot **120×60**,
헤더 North (39,50), South (39,135), 전체 제목 Region **(10,92.5)**, 모두
12px/400/sans-serif/색상 #0f172a, 회전 -π/2다. 공개 목표 호출은 기존 body 뒤
`.editFacetHeaders({role:"column", title:{text:"Region",offset:64}})`다.
해당 제목은 plot 합집합 중심 y92.5에 맞으며 원본 행/패널 수를 변경하지 않는다.
`REPRODUCTION.json`에 기존 거부와 정확한 primitive 값, PNG 해시를 기록한다.
