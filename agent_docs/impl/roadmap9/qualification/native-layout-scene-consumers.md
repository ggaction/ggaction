# 계층·Flow layout의 현재 프레임 소비자

## 진행 상태

- [x] Tree/Treemap/DAG/Cyclic의 실제 layout 편집과 native identity 확인
- [x] 명시 fallback, authentic current-frame rebase/reverse, 전체 offline frame 비교
- [x] scene-animation 네 셀만 owner 추가; 다른 owner와 분모 보존
- [ ] 일곱 family의 field encoding/scale/guide 21개 셀의 positive 소비자 설계·구현
- [ ] 발견 가능한 package runtime owner 및 최종 native candidate qualification

[기존 잔여 승인](../AUTHORIZATION.json)을 재사용한다. 새 API·수치 정책·저장 문법·runtime·
shared animation owner를 바꾸지 않는다. 원본은 `49f7190ec74133c6d1d28ac891d63bf099037a71`이다.

## 실제 실행 범위

`test/unit/animation/resource-layout-fallbacks.test.js`는 세 노드의 typed hierarchy와 기존
작은 Flow tooltip fixture를 사용한다. Tree의 depth/sibling gap, Treemap의 size,
DAG/Cyclic의 nodeWidth/nodePadding을 기존 `editLayout`으로 편집한다. Native output은
달라지지만 node/link logical key와 원행은 그대로다.

Tree의 두 link는 primitive-role, 세 node는 unsupported-family reason으로 명시 crossfade한다.
Treemap 세 cell, DAG 두 link+세 node, Cyclic 세 link+세 node도 unsupported-family다.
중간 40ms에서 각 body는 정확히 .6/.4 가중치를 갖는다. Enter/exit는 없고 실제 양 끝
graphicSpec은 native 원본 객체와 같다. 새 typed layout interpolation이 구현됐다는 주장이 아니다.

최초 계획의 0/20/40/100ms와 중단 후 정방향·역방향 계획의 0/30/60ms를
`serializeAnimation`→`deserializeAnimation` 후 **전체 frame**으로 비교한다. Authentic current
frame은 정방향 0ms 및 역방향 마지막 시각에서 동일 객체다. 모든 실행 뒤 원 program의
직렬화 값은 변하지 않는다. Generic static scene만 실행한 근거로 대체하지 않는다.

새 네 사례는 Node20/22/24에서 모두 통과했다. Native lifecycle·동일 family 소비자·discovery·
manifest와 합친 75개도 통과했다. Source/package는 변경하지 않았으므로 이전 Contour
checkpoint의 고정 archive를 재포장하거나 installed 결과를 새 패키지 증거로 세지 않는다.
정확 명령과 결과는 [증거](native-layout-scene-evidence/summary.json)에 기록한다.

## 남은 21개 셀

Tree, Treemap, Partition Cartesian/Polar, Graph, Flow DAG/Cyclic의 field encoding·scale·guide
셀은 그대로 pending이다. GRAPHS와 FLOWS Current는 stored layout에 일반 position encoding,
scale geometry와 axis/scale legend를 적용하지 않는다고 명시한다. Hierarchy와 Partition은
native layout/mapping, typed style overrides, semantic labels를 제공하지만 이것만으로
field→scale→guide 소비자를 입증하지 않는다. 실제 공개 encodeX/encodeColor/encodeSize와
targeted createLegend 호출은 해당 resource mark를 지원 target으로 받지 않는다.

이 거부 사실을 기능 pass나 N/A로 바꾸지 않는다. 다음 작업은 원 acceptance 의미를 다시
대조하고, Current가 허용하는 paired native mark/guide composition에서 실제 source revision,
field mapping, scale 편집, guide 갱신과 resource sibling 격리를 함께 입증할 수 있는지
구체적으로 설계한다. Positive 소비자가 부족하면 그 구현 의무를 명시한다. Stored layout을
일반 positional scale로 다시 계산하거나 분모를 줄이지 않는다.

이번 delta는 네 scene owner뿐이다. 전체 30요구/79group/577target, 기존 owner/applicability와
candidate 결과는 그대로다. Root의 574required+3Image N/A와 나머지 병렬 변경은 통합 시 보존한다.
전체 STEP077 또는 native completion을 선언하지 않는다.
