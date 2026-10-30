# 남은 native guide 의미 준비

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)로 남은 API·저장·시각 결정을 재사용한다. 재질문하지 않는다.
- [x] [원 animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md)의 guide 값 대응 및 AT-42/44를 현재 native 소유자와 대조했다.
- [x] Band edge membership, axis title anchor, Parallel field geometry의 native 계산 소유자를 분리했다.
- [x] 이 준비를 typed guide 의미·current frame·strict offline에 연결하고 consumer를 검증했다.
- [x] Native label의 settled wrapping과 measured edge/flush/rotation 계산을 공유했다.
- [ ] 준비된 label group의 closed animation 의미·title ink dependency와 legend를 공개 연결한다.

## 현재 소유 경계

Shared `planner/sample/frameEndpoint/frameProvenance`는 root의 timeline 통합이 소유한다.
아래 초기 준비 절은 native geometry/read-only meaning의 독립 checkpoint 기록이다.
후속 공개 연결의 지원 범위와 guide manifest 확대는 마지막 절과 Current Animation이 소유한다.
기존 [공개 guide slice](GUIDES.md)와 원격 `312026112`의 증거는 그대로 유지한다.

1. `grammar/gridGeometry.js`는 selected band의 start/end를 native scale center와 bandwidth로 계산하고
   같은 좌표를 중복 제거한다. 원 dash는 기존처럼 첫 selected band가 소유한다. 의미 대응용으로는
   겹친 edge의 **모든** `{value,edge}`를 보존한다. Boundary identity는 이 전체 typed membership이며
   배열 index·첫 범주의 이름·pixel 좌표가 아니다. Padding이나 subset 변경으로 membership이 달라지면
   다른 topology로 보고 enter/exit 또는 명시 fade한다.
2. `grammar/axisGeometry.js`는 title의 `start/center/end` range 역할과 명시 `at`의 기존 scale mapping을
   그대로 소유한다. Log 수치는 원 transformed-space 정책을 따른다. Label-relative offset과 inferred
   clearance는 실제 label ink dependency이므로 마지막 x/y 차이를 raw offset으로 위장하지 않는다.
3. `grammar/parallelGuides.js`는 field 축의 native slot과 line/tick/label/title geometry를 소유한다.
   Native Parallel mark와 guide가 같은 slot 계산을 호출한다. 의미 key는 namespace+target+field+
   component+typed tick이고 field 순번은 identity가 아니다. 같은 field의 reorder는 현재 native normalized
   slot에서 이어지며 차원 제거/삽입 및 scale 변경의 지원 여부를 별도로 검증한다.
4. 문자열·font·실제 줄배치가 바뀌는 label/title은 text morph가 아니라 safe fade다. 같은 문자열과
   준비된 잉크 정책에서 scale/frame만 바뀌는 경우에만 native placement로 이동한다. Wrapping을 매 frame
   실행하거나 concrete Text의 차이를 의미로 추정하지 않는다.
5. Legend는 현재 categorical/interval/continuous sample과 summary/title/label role을 읽는 소유자를
   공유해야 한다. 다른 raw category나 interval을 표시 문자열·sample index로 대응시키지 않는다.
   Legend layout의 geometry를 임의 pixel tween하는 공통 우회 경로는 만들지 않는다.

## 검증 경계

이번 준비 checkpoint는 기존 native action 출력·trace의 보존과 독립 literal geometry를 증명한다.
공개 transition endpoint/sample/재기준/offline/네 renderer를 새 범위에서 통과했다고 세지 않는다.
후속 연결은 위 준비값의 closed validation, finite/work budget, native forward equality와
raw identity를 함께 검증하고 기존 guide manifest owner에 version을 한 번만 선언한다.
전체 STEP061/062/063/077 완료와는 별개다.

독립 계산 추출의 실행·원 출력 동등성·설치 근거는 [anchor 증거](guide-anchor-evidence/README.md)에 둔다.

## Closed anchor 의미 준비

`grammar/animation/guideAnchors.js`는 제목·band 경계·Parallel field guide의 세 closed shape를
정규화하고 native owner로 geometry를 재생한다. `materialization/animation/guideAnchors.js`의
`guideAnchorItems`는 한 child scope에서 exact graphic ID와 owner/field/raw value를 연결한다.
이 준비 checkpoint는 공용 guide vector/planner에 아직 연결하지 않으며 공개 manifest version도
변경하지 않는다. `remainingApproval`은 이 결정을 포함하지만 공개 소비자 검증을 대신하지 않는다.

- Cartesian title은 명시 numeric offset, side, alignment/baseline 및 range의 start/center/end 또는
  numeric `at`+정규화된 native scale을 보존한다. 값 보간 후 같은 scale owner로 매핑하며 log 화면
  좌표의 중간점을 의미값이라고 취급하지 않는다. Native에서 허용하는 음수 offset도 유지한다.
  Inferred offset과 label-relative offset은 아직 ink dependency를 보존하지 못하므로 `guide-layout`
  상태다. Polar title은 theta의 frame 역할과 radial inside/outside·offset·shortest angle을 재사용한다.
- Band boundary는 `{value,edge}`의 canonical typed set을 보존한다. 선택 순서·객체 property 순서·
  동일 member 중복으로 key가 달라지지 않는다. 서로 다른 edge를 한 boundary로 주장하는 입력을
  거부한다. Range를 샘플링한 뒤 기존 band owner에서 경계를 재생하며 domain/padding/direction 또는
  membership 변경은 기존 scale/guide fallback이다.
- Parallel은 field를 identity로 보존하고 native slot의 `{index,count}`를 별도 geometry 의미로 둔다.
  중간에는 두 값을 연속 보간해 기존 `width/(count-1)*index` 연산을 그대로 호출한다. Endpoint의
  연산 순서를 바꿔 ULP 차이를 만들지 않는다. Field 추가·삭제·reorder 시 같은 field만 대응하며,
  tick은 같은 typed raw value를 같은 scale owner로 다시 매핑한다. 줄·tick·label·title의 native
  geometry를 재사용하며 표시 문자열·font·줄 배열 호환성 검사는 후속 track owner가 담당한다.
- 모든 shape는 descriptor-safe own data, closed fields, finite geometry와 item/work 한도를 검사한다.
  Source preparation은 semantic/config를 읽기만 하며 trace·materialization을 실행하지 않는다.
  현재 native Parallel tick 선택만 `materialization/guides/tickValues.js`로 공유해 계산 복제를 막는다.

실행 증거는 [closed anchor 증거](guide-anchor-state-evidence/README.md)에 기록한다. Title/legend/
Parallel/reflow/band-boundary 공개 전환, namespace 대응·재기준·strict offline·4 backend의 후속
통합 의무를 이 독립 준비로 완료 처리하지 않는다.

## Native label 배치 준비

`materialization/axisLabelLayout.js`의 `prepareAxisLabelLayout`은 이미 검증된 native 값과
선택 indices, scale, frame, config, text metric profile을 받는다. 원 값·indices와 표시 문자열을
분리하고 empty label을 숨긴 뒤 기존 wrapping owner를 한 번 호출해 줄을 고정한다.
`resolvePreparedAxisLabelLayout`은 그 줄과 같은 native 측정 profile만 사용하여 회전·edge clearance·
flush·명시 align 및 occupied/collision bounds를 계산한다. `maxWidth`나 responsive 폭을
매 frame 다시 선택하지 않는다. Native action이 Canvas/label/title 충돌을 검사하는 순서는 유지한다.

이 private 함수는 검증된 native 입력을 위한 계산 경계다. Config/profile 전체를 새 animation
payload로 저장하지 않는다. 후속 closed group state는 같은 raw values와 line roles, 필요한
준비 metric·font identity·배치 정책만 정규화하고 endpoint forward equality를 검증해야 한다.
줄·문자열·font 또는 responsive 선택이 달라지면 safe fade하며, 이를 final x/y offset 보간으로
우회하지 않는다. Schema1의 기존 측정 정책과 schema2의 missing exact metric 오류를 그대로
유지한다. Inferred/label-relative title은 이 label bounds와 title 측정의 의존성을 함께 보존한 뒤
연결해야 하며 아직 새 공개 typed 범위로 집계하지 않는다.

실행 증거는 [label 배치 준비](guide-label-layout-evidence/README.md)에 둔다.

## 공개 title/boundary/Parallel 연결

기존 remainingApproval에 따라 closed anchor를 guide state의 `{identity,kind:"anchor",anchor}`
분기로 연결한다. 공용 함수 원형과 root 소유 timeline transition version은 바꾸지 않는다.
새 의미의 오프라인 결과를 구버전과 혼동하지 않도록 guide manifest만 `native-guide-values@2`다.
Title value는 null, boundary value는 canonical member set, Parallel value는 `{field,value}`이며
component는 각각 title/boundary/parallel-{line,ticks,labels,title}이다. Parallel field slot은
identity가 아니고 native geometry 준비값이다. Scalar -0/0과 number/string 값은 구별한다.

Projection은 scope-local 준비에 전체 preparation work 계수를 전달하고 namespace를 적용한다.
Track/sample/flat provenance/strict restore는 기존 semantic-guide 경계를 그대로 사용한다.
Native forward geometry 불일치는 guide-edited, 변경된 문자열·font는 appearance fade다.
Inferred/relative title ink, legend와 복잡한 reflow는 이번 확대에서 완료 집계하지 않는다.

새 공개 pair 검증에서 기존 Parallel body의 sampled-concrete→unsupported-family 복원 reason
불일치를 발견했다. Guide geometry/scene은 같으나 전체 frame equality는 실패하여 root 소유
shared planner에서 별도로 보수한다. 첫 실패와 보수 후 결과를 증거에 구분한다.

공개 연결 후보 source `bd8ce86d1`의 첫 실패는 보존했다. Root와 같은 retained-vector transport
수리를 적용한 최종 source에서 animation350/350·7 critical owners와 같은 tar의 Node20/22/24
각2공개 소비자·strict types·6bundles가 통과했다. [최종 증거](guide-expanded-evidence/qualification.json)와
[실행 기록](guide-expanded-evidence/README.md)은 초기 후보와 안정 체크포인트를 구분한다.

## 후속 legend·reflow 소유권 준비

`interaction/hitLegends.js`의 read-only sample/label 대응은 현재 일부 native action 모듈의
계산 함수를 읽는 명시 예외다. 이를 그대로 materialization으로 옮겨 새 역방향 import 예외를
만들지 않는다. 먼저 exact sampling은 grammar, effective block config와 resolved sample/label
선택은 materialization, native 배치는 기존 layout owner로 나누어 현 함수를 그대로 재사용한다.
현재 필요한 추출 대상은 `resolveEffectiveLegendBlockConfig`, categorical active config와 label
선택, `resolveLegendSampleValues`, size/colorSize/gradient의 resolved sample/label 선택이다.
Wrapped create/edit/materialize와 trace는 action owner에 남긴다.

첫 추출에서 `grammar/legendSampling.js`와 `materialization/guides/legendConfig.js`를 만들고
기존 action·hit caller의 import를 같은 owner로 옮겼다. 예전 sampling 모듈은 삭제하여 compatibility
wrapper를 남기지 않는다. Categorical kind 목록은 기존 `grammar/legendBlocks.js`가 단일 소유한다.
Native graphic/semantic/trace와 legend hit의10개 공개 예제 동등성,570개 owning 및 새 owner 두 개의
100/100/100을 확인했다. 이 준비는 아직 공개 typed legend나 reflow 완료가 아니다.

후속 metadata owner는 namespace와 native target/block family, component, typed raw category나
interval endpoints를 보존한다. Overflow summary와 title은 별도 명시 role이며 현재 hit key와
선택 결과를 바꾸지 않는다. Sample의 line/point/swatch layer와 clip window는 동일 native
`legendSampleGraphicGroups`를 재사용한다. 표시 text나 item index를 의미 key로 삼지 않는다.

Label reflow는 이미 준비된 wrapping/측정값을 native measured placement에 전달하는 범위다.
현재 profile 전체나 최종 x/y 차이를 새 의미로 저장하지 않는다. 각 raw label의 settled lines와
필요한 정확 측정치, field/scale/frame·정책을 닫힌 준비값으로 검증한 뒤 native edge/flush 배치를
재생한다. Inferred title은 이 label bounds 의존성을 함께 보존해야 한다. 이 절은 구현 계획이며
새 공개 typed 지원이나 qualifier 통과로 집계하지 않는다.

범례 값·label 첫 추출의 source/설치/실제자료 근거는 [owner 증거](legend-owner-evidence/README.md)에 기록한다.

## 범례 native layout과 item 대응 owner

후속 추출은 `materialization/guides/legendLayout`, `legendSamples`, `legendGradient`로 기존
크기·색상/크기·gradient의 read-only 계산을 옮겼다. 원 action은 같은 함수를 명시적으로 호출하고
trace와 graphical write 순서는 유지한다. `legendItems`는 같은 native layout 결과에서 typed
raw value/interval endpoints·symbol layer role·title/summary·exact graphic ID를 읽는다. Hit는
이 owner를 사용하므로 범례 관련 action 역방향 import 예외가 모두 없어졌다. Clip 안의 glyph와
line/point/swatch 대응도 원 `legendSampleGraphicGroups`를 사용한다.

이 단계의 공개 signature와 저장형식은 그대로다. 후속 typed state는 pure 축/anchor의
`grammar/animation/guideState`를 유지하고 native layout/정확 측정치를 사용하는 materialization
owner로 분리한다. `guideTracks`의 validate/prepare/sample wrapper를 통해 같은 semantic-guide
seam을 사용하며 root의 v3 sampler에는 import만 좁게 연결한다. Endpoint program이나 전체
font profile을 저장하지 않고 필요한 측정과 semantic owner/값·배치 정책만 strict proof로 보존한다.


## Exact gradient 범례의 typed 연결

`AUTHORIZATION.json#remainingApproval`의 남은 공개 API·저장·시각 결정 승인에 따라 기존6API 안에서
단일 edge의 color/stroke gradient를 연결한다. `legendState`는 필요한 font query closure와
원 native config/frame/scale 의미를 닫힌 준비값으로 소유하며 `legendGuides`가 exact graphic ID에
대응한다. Native gradient layout과 60분할 strip geometry를 기존 action과 공유한다. 값의 log
mapping, 네 edge 배치, hard-break title, schema2 font proof, 바뀐 sample의 enter/exit, 현재 frame
재기준과 strict offline을 검증한다. 실제 Canvas/SVG/PNG/PDF는 같은 vector frame을 소비한다.

Root 승인된 shared seam 예외는 sample의 guideTracks import 한 줄과 frameEndpoint의 guide
primitive 허용목록에 rect 하나뿐이다. 전체 transition version2는 이 branch에서 유지하며 root의
version3 timeline은 후속 합산에서 보존한다. Guide manifest의 단일 owner는 native-guide-values@3이다.

범례 item grid/categorical/size, auto sampling, border/group/multi-lane 및 axis flush·rotation·responsive
reflow와 inferred title 의존성은 후행 의무다. 이 checkpoint를 범례 전체 또는061/062/063/077
완료로 집계하지 않는다. 첫 rect admission 실패와 이후 통과를 evidence에서 분리한다.
