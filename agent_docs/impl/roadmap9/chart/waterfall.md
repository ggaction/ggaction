# Waterfall native vertical slice

## 진행 상태

- [x] 기존 순수 값 owner와 structure-recipes 계약 확인
- [x] 독립 primitive·수치·렌더 증거
- [x] 공개 create/edit·consumer 구현
- [x] Current/types/docs/package 검증과 checkpoint

Gate는 `../AUTHORIZATION.json`의 remainingApproval(남은077의 API·저장·아키텍처·시각 결정을 구현자가 선택·검증하도록 명시 승인)에 따른 approved 상태다. 아래 구체 선택과 실제 증거를 기록하며 추가 승인 질문을 하지 않는다. 검증 완료를 승인만으로 대체하지 않는다.

## API와 의미

Full `createWaterfallPlot({id?,data?,coordinate?,x,role,value,reset?,yScale?,width?,bars?,connectors?,labels?,color?,clip?,guides?})` / `editWaterfallPlot({target?,...patch})`.

x는 categorical field string 또는 `{field,fieldType?:nominal|ordinal,scale?}`이다. role/value는 source field 이름이고 reset은 field 이름 또는 false(removes binding)이며 role 값은 delta/total/subtotal로 명시한다. role은 라벨에서 추론하지 않는다. value field가 있는 subtotal, reset field가 있는 delta, missing/invalid delta value, accumulation overflow는 기존 `resolveWaterfallValues`가 거부한다. total의 값이 없으면 현재 누적값을 쓰며 명시 total은 누적을 바꾸지 않는다. reset:true인 total/subtotal만 이후 누적을0으로 만든다. 자동 정렬·누락 행 건너뛰기·가격/합계 합성은 하지 않는다.

기본 id waterfall, width band.72, connectors:{}, labels:false, clip:true, guides:{}이며 edit의 guides 생략은 기존 축을 새로 만들지 않는다. bars는 positiveFill #16a34a / negativeFill #dc2626 / totalFill #2563eb / subtotalFill #64748b, stroke #334155,width1,opacity1. connector는 stroke #64748b,width1,opacity1. appearance는 기존 FillPaint/outline/shadow 소유자를 사용한다. labels는 content:value|end|category,format:auto,font sans-serif12/normal,fill#0f172a,offset6. color field가 있으면 bar fill을 공통 색상 scale로 대체한다.

semantic encoding.x/y는 category/value 필드와 scale을 저장한다. layer.waterfall은 role/reset/label 의미만, markConfigs[id].waterfallPlot은 width/bars/connectors/labels/clip만 소유한다. y scale의 domain은 실제 start/end 누적 endpoints에서 계산하며 원 delta 값을 endpoint처럼 읽지 않는다. x ordinal domain과 위치는 공통 band owner를 따른다. 누적 계산 순서는 원 입력 순서이며 duplicate x도 typed row key를 보존한다.

## Primitive와 identity

기존 Rect가 start↔end body, open Path가 incoming connector, Text가 optional label이다. 높이0은 그대로0이며 보이기 위한 가짜 증가를 하지 않는다. connector i는 이전 body의 오른쪽→현재 body의 왼쪽에서 현재 runningBefore를 표시한다. 값이 독립적인 explicit total 또는 reset이 있어도 connector가 표시하는 누적 의미를 바꾸지 않는다. connectors:false로 명시 숨길 수 있다.

각 item의 key는 해당 role row의 typed dataset key다. delta 및 explicit total은 자기 row, implicit total/subtotal은 누적에 기여한 delta rows와 자기 control row를 source lineage로 가진다. reset 이후 누적 contributor 집합도 명시 초기화한다. 값·category label·index는 identity가 아니다. body/connector/label을 선택 이벤트 여러 개로 쪼개지 않는다.

## 검증과 남은 의무

독립 fixture는 +5,-2,subtotal,+4,total → [0,5],[5,3],[0,3],[3,7],[0,7]이다. 원본 pure oracle의 negative/explicit total/reset/overflow 검사도 유지한다. create/edit/revise/rebind/remove, appearance/color/guide/font/theme, filter/highlight/hit/accessibility, Canvas/coordinate/scale, facet/nested, editable/graphic codec와 offline4formats를 연결한다. 첫 child 전 pure complete candidate, renderer graphicSpec-only, Full/Basic 경계를 유지한다. STEP050 합산 admission·STEP074 전체검증은 별도 남은 의무다.

## 확인된 체크포인트

공개 source `ba2062ce01ea14448b7123d13861f056d43c37e2`의 실제 결과는 [evidence summary](waterfall-evidence/summary.json)에 고정했다. 동일 tar를 Node20/22/24에서 각각3개 실제 공개 lifecycle·strict types·optional peers·5개 browser bundle로 확인했다. source의1020 package entry는 canonical staging 결과와 byte hash가 모두 같으며, 최초 실패와 owning repair 결과를 함께 보존한다. 최신 통합의 single-Y admission과 STEP074 전체 검증은 이 checkpoint의 완료 주장에 포함하지 않는다.
