# Pyramid 공개 수직 구현

공개 source 검증을 마쳤고 문서 source pin 및 최종 사이트 검증을 마감 중이다. [전체 승인](../AUTHORIZATION.json)의 `remainingApproval`을 적용한다.
사용자가 STEP077까지 남은 API·저장·시각 결정을 구현자에게 위임했으므로 별도 질문 없이
아래 구체안을 구현하고 실행 증거를 보존한다. 승인은 검증 성공을 뜻하지 않는다.

## 진행 상태

- [x] 기존 전체 승인·native stage 계약 및 공개 API/저장 결정 기록
- [x] Full create/edit와 명시 Path+Text materialization, typed row identity
- [x] geometry/label·selection·source/Canvas·theme/font·codec 소비자 집중 검증
- [x] primitive/public 6개·4 renderer·browser 1×/2× 및 실제 데이터 15개 recipe
- [x] 같은 archive의 Node20/22/24 공개 소비자·strict 타입·optional peers·5 bundle
- [ ] source pin 후 최종 문서·built browser 인수
- [ ] STEP050 합산 frame admission 및 STEP051/052 후행 정책 감사
- [ ] OHLC/waterfall·Trail·Table 및 STEP074/077 전체 인수

## 결정

`createPyramidPlot({id?,data?,coordinate?,stage,value,orientation?,encoding?,gap?,lastStage?,taperRatio?,percentBase?,stages?,labels?,color?,clip?})`
와 같은 옵션을 patch하는 `editPyramidPlot({target?,...})`를 Full에 제공한다.
stage/value는 field 문자열이다. id 기본은 유일한 `pyramid`; data와 Cartesian coordinate는
기존 current/unique/default 해석을 공유한다. Basic에는 공개 facade를 등록하지 않는다.

단계명은 중복 가능하며 identity가 아니다. 각 항목은 기존 dataset row key와 lineage로 식별한다.
입력 순서를 유지하고 별도 정렬 옵션을 추가하지 않는다. `layoutPyramidStages`에 row key와
value, 현재 plot bounds를 전달하며 width/area 및 방향·gap·percentBase 수식은 기존 owner가 유일하다.
값 오류는 전체 거부한다. 빈 입력과 all-zero 입력은 기존 kernel 의미를 유지한다.

`layer.pyramid`는 stage/value field, 정규화한 layout 의미와 label content/format을 저장한다.
`markConfigs[id].pyramidPlot`는 stages/labels appearance와 clip만 저장한다. 단계 의미와 appearance를
중복 저장하지 않는다. stages는 fill/stroke/strokeWidth/opacity 및 기존 outline/shadow를 받는다.
labels 기본은 stage, false로 끄며 content는 stage/value/percent이다. percent에는 명시 percentBase가
필요하고 0 분모의 null은 label을 생성하지 않는다. 숫자 format은 기존 Text formatter를 재사용한다.
color는 기존 field/fieldType/scale/palette 계약을 사용하며 false는 mapping을 제거한다.

기존 Path+Text collection으로 낮추고 한 stage의 body/label에 같은 logical item key를 부여한다.
선택·hit는 stage당 한 항목이고 label은 별도 데이터 항목이 아니다. 렌더러는 semantic을 읽지 않는다.
create/edit는 전체 pure candidate를 검증한 뒤 semantic primitive와 wrapped materializer를 실행한다.

## 좁은 stage 라벨 보강

실제 area 예제의 마지막 `Returned`가 경계에서 잘리는 것을 확인해 같은 Path 수치와 값은 보존하고
기존 Text wrapping/metrics owner로 라벨만 줄바꿈했다. 내부 4px inset 직사각형에 들어가지 않으면
vertical은 오른쪽, horizontal은 아래의 stage별 빈 lane을 사용한다. 공간 부족 시 첫 child 전에 오류,
labels:false는 배치 생략이다. 별도 persisted label geometry나 새 공개 옵션은 추가하지 않는다.
[전체 승인](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.

최초 realistic 라벨 실패 `.artifacts/pyramid-readable-realistic.log`도 보존한다. Dense 12행 width 및
pointed recipe에서 폭이 viewport 전체인 pointed/0→max stage는 내부 최소 폭과 바깥 lane이 모두
0이므로 명시 labels:false를 사용한다. 5개 area recipe는 라벨과 percentage 편집을 계속 검증한다.
원 데이터·값·순서·행 수·15개 recipe witness·분모는 변경하지 않는다.

## 소비자 행렬

- 계산/경계: 기존 kernel literal·독립 면적 oracle + public error/immutability/child0.
- 의미/trace: create/edit, data revise/rebind/remove, Canvas/coordinate, typed keys, labels.
- appearance: solid/gradient/pattern/outline/shadow/opacity/stroke, color scale와 legend, theme/font.
- selection/filter/highlight, inspection/accessibility, actual hit, scene/transition, nested concat/facet.
- editable/graphic codec, offline Canvas/SVG/PNG/PDF, source-free installed Full 및 Basic exclusion.
- canonical public example, explicit primitive baseline, browser readiness, tutorial 및 generated references.

실행 증거는 [검증 기록](pyramid-evidence/summary.json)에 보존한다. Cartesian x/y scale·axes는 자체 stage layout이므로 N/A이다.
STEP050의 최종 frame admission과 합산 검증은 root 통합 후 별도 기록한다.
STEP074/077 전체 누적 인수는 이 capability의 집중 검증으로 대체하지 않는다.

## native 정책

Pyramid는 단계형 의미의 공개 명칭이다. 외부 alias는 필수 의존이 아니다.
Marginal/Bullet/Combo는 공통 action recipe이며 전용 facade를 추가하지 않는다.
KPI/Gauge는 제외, set은 deferred다. Native active30요구/79시험군을 유지하며 외부2279참조를
필수 검사나 통과 분모로 세지 않는다. STEP051/052의 후행 native inventory 감사는 별도 pending이다.
