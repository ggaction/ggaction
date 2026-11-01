# Axis label native reflow — 구현 계약

상태: 승인된 설계의 native owner 추출을 진행한다. 공개 typed reflow는 아직 연결하지 않았다.
시작 source는 `f4a6f9aa28779c20d0a61f0cd51c547f110e65ea`, branch는
`codex/roadmap9-animation-axis-reflow`다. 기존 [전체 승인](../AUTHORIZATION.json)의
`remainingApproval` 및 이 구체안에 대한 root의 2026-11-01 채택을 재사용한다.
85 owner `6627fb246`와 image3 applicability `a63c1db35`는 이미 종료된 독립 checkpoint다.

## 진행 상태

- [x] 구체 closed group/동적 decision/shared seam 설계 채택.
- [x] Native candidate 계산 단일 owner와 기존 결과·오류·trace 동등 검증.
- [ ] Schema2의 bounded 중간 query 공급 경계 확정·검증.
- [ ] Closed group 준비/중간 native emission/strict restore·rebase 연결.
- [ ] 실제 현재 hit·offline·4 backend·동일 tar3Node 검증 및 공개 문서 동기화.

P가 담당하는 group/lane7과 title pure owner는 별도 source로 병합한다. Reflow의 guide kernel
manifest는 8로 잡되 최종 합산에서 group7의 의미를 모두 보존한다. 현재 단계에는 version을 올리지 않는다.

## 범위와 정본

원 animation 계약의 guides는 semantic tick value→coordinate mapping이며 array index로 label을
rename하면 안 된다. Current ANIMATION의 native guide 절은 maxWidth wrapping, responsiveResult의
skip/rotation/line-count reflow를 아직 typed 밖이라고 정확히 남긴다. 이 의무를 이어 구현한다.
현재 기준은 시작 source의 fixed-label 및 categorical6/size guide owner다.
P가 맡은 legend group/lane7·inferred/label-relative title은 변경하지 않는다.

고정 formatting/font/labelMap/wrap/responsive 정책 아래 현재 frame/scale/offset/alongOffset을 보간하고
현재 native layout을 재생한다. 실제 text content/font/policy 변경의 기존 안전한 fade는 유지한다.
일반 Text family, 새 public authoring action, generic registry, 두 번째 clock을 만들지 않는다.

## 단일 native 계산 경로

`materialization/axisLabelLayout.js`의 prepareAxisLabelLayout/resolvePreparedAxisLabelLayout은 유지한다.
`actions/guides/axes/labels.js`의 resolveAxisLabels/responsiveLabelWidth에 남은 native 후보 선택을
작은 materialization owner로 옮겨 native action과 animation에서 함께 사용한다. 입력은 resolved
raw values, scale, frame/canvas, config, 정확 profile, edgeAligned, 필요한 native layout 제약이다.
wrap→skip→rotate의 순서, maxLines/skipStride/rotationCandidates, overflow/overlap 및 flush 오류를
복제하지 않는다. 이 추출은 원 native 결과/오류/trace를 바꾸지 않는 별도 owning 비교로 검증한다.

## Closed prepared group

기존 endpoint guides는 실제 node와 길이가 같은 vector다. line-count/skip 변화에는 양끝 node가
없는 현재 line이 생길 수 있으므로 이 vector에 가짜 endpoint index를 붙이지 않는다. 새 좁은
axis-label 준비 owner만 `{groups, items}`를 소유하는 optional prepared 의미를 제안한다.
공개 plan은 계속 opaque이며 export/restore의 kernel manifest 버전은 root 합산에서 한 번 조정한다.

- group: `{key, scope, layout, presentation, placement}`.
- scope: `{namespaces, owner, channel}`; 실제 child scope 및 명시 axis owner의 labels component.
- layout: `{rawValues, mapping, frame, canvas, config, metrics, edgeAligned, constraints}`.
  mapping은 현 Cartesian value/scale owner의 닫힌 shape, config는 고정 font/format/labelMap/
  wrap/maxWidth/lineHeight/flush/align/overlap/responsive intent다. resolved responsiveResult는
  재생 결과이므로 별도 의미 정본으로 저장하지 않는다. constraints는 native candidate에 실제 필요한
  minPlotSize/반대 margin/title overlap 조건만 추출하며 전체 program이나 callback을 저장하지 않는다.
- presentation: concrete Text의 공통 native style/font/clip/offset. 프레임 배치의 x/y/text/rotation을
  이 정적 표현에 중복 저장하지 않는다. 기존 appearance owner를 재사용한다.
- placement: 실제 native labels collection의 scoped drawing address. native create는 length0 Text
  collection을 먼저 만들므로 zero-node라도 실제 collection 순서가 있다. 그 순서를 수집하며 임의
  node/sourceIndex를 만들지 않는다.
- items: 실제 scene node 순서의 null 또는 `{group, value, line}`. value는 typed raw tick, line은
  현재 native layout의 실제 line 번호다. hidden labelMap 값은 rawValues에 남아도 절대 그리지 않는다.

Raw value 중복/순서·policy 변경은 기존 명시 ambiguity/content fallback을 유지한다. group의 raw
cohort와 current native 결과는 한 번만 준비하고 각 node에 layout 사본을 따로 저장하지 않는다.
동일 표현 문자열을 가진 다른 raw value는 독립 identity다. 빈 group도 native axis config/실제
collection에서 수집하고 endpoint의 보이는 items로 group을 역추론하지 않는다.

## Sample, source proof, rebase

각 compatible group은 owner의 timeline progress에서 현재 scale/frame/offset을 먼저 계산하고
native 후보 선택→wrap/skip/rotate→실제 line 목록을 한 번 재생한다. endpoint t0/t1은 기존 exact
scene/graphicSpec/view 참조를 반환한다. Interior는 raw value+line의 실제 guide key를 갖는다.
배치 규칙의 경계에서 line 구성이 바뀌는 것은 native reflow이며 원 endpoint pixel lerp로 대체하지 않는다.

새 dynamic decision은 기존 guide role/key/owner key를 유지하되 endpoint index를 필수로 요구하지 않는
닫힌 변형은 `{kind:'guide', kernel:'native-axis-label', ownerKey, guideKey, role:'guide-labels'}`다.
Root가 기존 geographic과 병렬인 이 좁은 shape를 채택했다. 실제 raw value/line은 prepared
items에서 유일하게 확인하며 임의 unknown fields는 거부한다.
이 decision이 mark/background identity를 만들거나 다른 axis를 가리킬 수 없게 한다.

현재 frame의 prepared group은 현재 scale/frame/config와 query closure만 보존한다. 옛 plan/program
chain은 보존하지 않는다. strict restore는 전체 group의 layout 일치, 실제 native line 집합·순서,
Text concrete equality와 items/decisions cardinality를 다시 검산한다. 선택 결과/line count/indices/
rotation을 payload에서 신뢰하거나 query 누락 때 font estimate로 바꾸지 않는다. sampled frame을
양방향 endpoint로 쓰는 기존 rebase/withSampleTime/flat provenance 경로에 같은 의미를 보존한다.

Current hit에는 exact native program+childPath+axis owner+raw value의 source origin이 필요하다.
기존 guideHitToken/guideHitItemKey를 재사용하며 raw tick source membership은 source owner에서
확인하고 실제 clip/ink는 sampled scene을 쓴다. line별 index가 endpoint에 존재한다고 가정하지 않는다.
Guide는 data/resource mark lineage가 아니므로 Geo lineage나 가짜 dataset ref로 포장하지 않는다.
이 source-reader/flat origin seam은 D와 조율하며 offline 의미 검산과 native interaction authority를
혼동하지 않는다.

## Metrics와 예산

고정 width에서는 native wrap 결과와 그 실제 쿼리를 그대로 준비한다. responsive width가 변하면
동일 text의 유한 wrap query closure가 필요하다. 토큰/문자 분할은 native wrap owner를 공유하며
유효한 word/grapheme 구간과 native 후보에 필요한 문자열을 deduplicate한다. 모든 문자열의 길이와
query 수를 사전 계산해 기존 FONT_METRIC_MAX_QUERIES/TEXT_UNITS 및 10M work를 적용한다.
새 중복 cap을 만들거나 무제한 O(n²) 열거 후 뒤늦게 검사하지 않는다.

중요한 현 경계: schema2 prepareTextMetrics는 실제 endpoint native layout의 쿼리만 host에 요청한다.
양끝 query 합집합이 모든 중간 문자열을 덮는다고 가정할 수 없다. sampler는 host/Canvas를 호출하지
않고 missing query를 명시 오류로 유지한다. 정확 closure를 기존 font 준비 경로에 공급하는 좁은
방법은 구현 전 추가 검토한다. 모든 native font 요청에 무조건 quadratic 측정을 추가하거나 기존
성공 요청을 animation 준비 없이 더 엄격하게 만들지 않는다. Schema1의 기존 estimate 의미도
exact font 측정으로 잘못 표기하지 않는다.

한 sample의 generated nodes는 기존10k, 실제 candidate/measure/collision 누적 작업은 기존10M다.
raw text 길이·최대 grapheme line 수에서 보수적 출력 상한을 준비하며 endpoint0개가 예산 우회가
되지 않게 한다. exportAnimationFrames의 실제 frame node 누적 guard는 유지하고 group의 잠재
line×schedule work도 기존 owner에 사전 연결한다. 부분 frame/export batch는 외부에 노출하지 않는다.

## 영향 파일과 검증

직접 owner 후보: materialization/axisLabelLayout.js, 새 native responsive candidate helper,
actions/guides/axes/labels.js(위임만), materialization/animation/axisLabelState.js 또는 좁은 group
helper, animation/axisLabelTracks.js·axisLabelFrames.js, native materialization/animation/guides.js의
label 수집 및 animation/guideTracks.js의 해당 dispatch. P의 legend branch들은 그대로 보존한다.

필요한 shared seam은 root와 함수별 확인 후 적용한다: planner 준비/strict export-restore/kernel,
sample dynamic group insertion/order+actual work, frameEndpoint closed decision/native origin/flat capture,
frameProvenance의 optional self-contained 의미, timelineTracks의 guide owner/item style target,
frames의 잠재 line work. Types/Current/docs는 실제 연결된 범위만 동기화한다.

검증: literal widths와 독립 native current-frame oracle; endpoint exact; 중간-only raw value/line,
wrap/skip/rotation 경계와 반복 문자열·숨긴값·nested namespace; 명시 policy/content fallback;
현재 frame rebase/negative interrupt 및 offline freshprocess same-time equality; getter/추가필드/
unknownversion/metrics·line·slot변조; query/node/work budget 선행 거부·입력불변; 4backend/current hit;
같은 tar3Node 소비자. 최종 AT60/77·전수 release 검사는 root가 별도 소유한다.

## Schema2 명시 준비 옵션 채택

Root는 2026-11-01 `prepareTextMetrics(program, {id, fonts, axisLabelReflow:true}, host)`를
기존 remainingApproval 범위의 구체 선택으로 채택했다. 함수/저장 profile shape/renderer를 새로
만들지 않는다. 옵션 생략의 기존 query 경로는 유지하며 명시 true일 때만 현재 native raw tick에서
고정 표시문자열의 bounded wrap closure를 준비한다. `false`/생략은 기존 준비이며 잘못된 타입은
host 호출 전에 거부한다. Native tokenizer를 공유하고 query 수·문자 단위·work의 현재 상한으로
사전 검산한다. 임의 사용자가 제공하는 query 옵션은 없다. 자동 domain-dependent format의 중간
문자열을 증명하지 못하면 typed content fallback을 유지한다. 이 옵션의 실제 구현·types·Current·
docs·설치 증거는 다음 checkpoint이며 현재 source에는 추가되지 않았다.

## Native candidate foundation 검증

`axisLabelCandidates.js`는 actual values/scale/frame/canvas/profile 및 필요한 title bounds를 받아
native→wrap→skip→rotate를 단독 계산한다. Action은 기존 resource lookup/검증/명시 trace를
보존한다. 선택된 실제 labelBounds와 전체 requiredBounds를 반환하여 후속 title이 같은 ink를
소비할 수 있다. 이 checkpoint는 공개 typed reflow 지원을 뜻하지 않는다.

- Native 축·가이드·Canvas 관련 owning 1,181개 통과.
- 새 literal 8개와 기존 responsive 9개, 후보 owner coverage 100/100/100.
- Boundary/discovery/documentation 33개, package contract 7개 통과.
- 추출 전후 26 chain의 설정·guide graphics·mark properties·trace·오류 정합 일치.
  자동 생성 UUID 기반 mark identity는 별도 실행이라 비교에서 제외했다.
- 동일 Node22 tar의 기존 public responsive 2사례: Full/Basic·resize/restore 및
  Canvas/PNG exact·SVG/PDF·scene/codec 통과. 전체 설치나 3Node 완료 주장은 하지 않는다.
- 최초 package file count 1,219>1,218 및 unpacked 7,838,354>7,835,900을 보존하고
  실제 새 owner 1파일에 맞춰 count1,219/unpacked7,838,400으로 최소 보정했다.
  Packed cap1,740,000 및 bundle caps는 그대로다.
- 설치 harness 첫 실행의 optional Canvas peer 누락은 준비 단계 오류였다. 기존 canonical
  optional-peer 준비를 재사용한 같은 archive 재실행을 별도로 보존한다.

정확 명령·hash·원 실패와 성공 로그는 [foundation evidence](axis-reflow-evidence/foundation.json)에 있다.
