# W3 C2 — 참조선·참조 구간

상태: approved. 전체 실행 승인은 [APPROVAL](../APPROVAL.md)에 따른다.

`createReferenceLine({ y: 5 })`, `createReferenceBand({ x: [2, 6] })`는 정확히 한 축의
상수 위치를 받아 Rule/Rect와 기존 position encodings로 내려간다. 데이터 좌표가 기본이며
`source`는 explicit → current eligible → unique eligible Cartesian layer 순서다.
선택한 축의 데이터·coordinate·scale·fieldType·temporalUnit을 사용한다. Band는 quantitative/temporal만
허용한다. 참조값도 자동 domain에 기여한다. source는 생성 시 binding 선택이며 종속 child 관계가 아니다.

`space: "plot"`는 숫자 [0,1]을 받는다. x=0은 왼쪽, y=0은 아래쪽이다. `data?`, `coordinate?`는
기존 하위 액션의 유일한 추론을 따른다. 새 데이터는 만들지 않는다. 빈 기존 데이터도 허용한다.
`<id>-<axis>` linear scale의 domain=[0,1], range=auto를 만든다. 기존 createScale의 동일 정의 재사용·
다른 정의 거부 규칙을 그대로 적용한다. removeMark 뒤에도 일반 named scale처럼 유지되며, 그 스케일을
편집했다면 동일 ID의 plot 참조를 다시 만들 때 충돌을 명시한다. 별도 소유권 registry를 만들지 않는다.

기본 ID는 referenceLine/referenceBand. Line 기본은 #64748b, width=1, dashed, opacity=1.
Band 기본은 #94a3b8, opacity=.15, stroke=false. 사용자의 명시적 스타일은 하위 mark 옵션과 같다.
Band에 strokeWidth만 주면 기본 stroke=false와 충돌하므로 stroke도 명시해야 한다.
추후 위치·스타일·스케일 편집과 삭제는 encodeX/Y/X2/Y2, editRuleMark/editRectMark, editScale, removeMark가 소유한다.
추가 라벨은 createMarkLabels의 명시적 value/field를 쓴다. polar/parallel source는 거부한다.

전체 child chain을 immutable discarded branch에서 사전 검증한 후 실제 wrapped children을 실행한다.
별도 editReference*는 만들지 않는다. Basic에는 노출하지 않는다. primitive PNG를 먼저 생성·검토한 후
public parity, 오류 원자성, 추론, category/time/log/reverse, resize, removal, labels, package/types/docs를 검증한다.
