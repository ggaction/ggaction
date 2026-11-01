# Axis label native reflow — 구현 계약

상태: native owner·exact font 준비·closed group 이후 공개 typed reflow를 연결했다.
현재 component qualification을 마감하며 전체 roadmap/최종 release 완료는 아니다.
시작 source는 `f4a6f9aa28779c20d0a61f0cd51c547f110e65ea`, branch는
`codex/roadmap9-animation-axis-reflow`다. 기존 [전체 승인](../AUTHORIZATION.json)의
`remainingApproval` 및 이 구체안에 대한 root의 2026-11-01 채택을 재사용한다.
85 owner `6627fb246`와 image3 applicability `a63c1db35`는 이미 종료된 독립 checkpoint다.

## 진행 상태

- [x] 구체 closed group/동적 decision/shared seam 설계 채택.
- [x] Native candidate 계산 단일 owner와 기존 결과·오류·trace 동등 검증.
- [x] Schema2의 bounded 중간 query 공급 경계 확정; source owning/strict types 검증. 설치·문서 증거는 아래 후속 기록.
- [x] Closed group 준비/중간 native emission/strict restore·rebase 연결.
- [x] 실제 현재 hit·offline·4 backend·동일 tar3Node 검증 및 공개 문서 동기화.
- [x] Source pin 뒤 변경 문서 페이지 build/browser 마감.
- [x] P의 동적 title/lane 실제 dependency 소비 및 합산 component qualification([기록](dynamic-guide-merged-evidence/qualification.json)).
- [ ] 최종 native matrix·전체9명령·독립 검토 및 STEP077 전달.

P가 담당하는 group/lane7과 title pure owner는 별도 source로 병합한다. Reflow의 guide kernel
최초 설계의 manifest8 예약 이후 통합이 guide10까지 진행되어, 공개 동적 emission은
root와 조율한 guide11을 사용한다. 기존 group/lane7·고정 title9·lane10 의미를 보존한다.

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

Schema2의 기본 prepareTextMetrics는 실제 endpoint native layout의 쿼리만 host에 요청한다.
양끝 query 합집합이 모든 중간 문자열을 덮는다고 가정할 수 없다. sampler는 host/Canvas를 호출하지
않고 missing query를 명시 오류로 유지한다. 아래 명시 opt-in만 native tokenizer의 유한 closure를
기존 font 준비 경로에 공급한다. 모든 native font 요청에 무조건 quadratic 측정을 추가하거나 기존
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
문자열을 증명하지 못하면 typed content fallback을 유지한다.

구현 owner는 `materialization/axisLabelQueries.js`이며 `layout/text.js`의 기존 tokenizer를 공유한다.
현재 raw tick→표시 문자열의 hard line과 native word 공백 정규화 후 연속 grapheme 문자열을
보수적으로 열거한다. 이는 실제 width별 query의 유한 상위집합이며 최소 query 집합이라는 주장은
하지 않는다. String allocation 전에 누적 work를, query 저장 전에 unique query/UTF-16 한도를
검사하고 전체 collector가 성공한 뒤에만 font decoder/measure를 호출한다. Nested exact tuple은
deduplicate한다. 조합형 문자/ZWJ grapheme을 잘라 임의 query로 만들지 않는다.

`resources/textMetricsFull.js`는 명시 true일 때만 closure를 기존 prepared measurements에 넣고
원래 native missing-query pass를 그대로 이어간다. handle/profile 저장형식은 그대로다. Font 교체는
기존 정책대로 새 native layout에 필요한 profile을 준비하므로 과거 opt-in closure를 암묵 유지하지
않는다. 교체 후 새 receiver에서 opt-in 재준비가 필요함을 Current/types/docs와 실제 회귀로 고정한다.

새 owning 8개와 기존 font/grapheme14개가 통과했다. 새 query owner100/100/100,
기존 font preparation100/93.33/100으로 해당95/90/100 floor를 유지했다. 전체 repository coverage나
동적 공개 animation reflow 완료로 확대하지 않는다. 최초 owning fixture의 잘못된 native width/
responsive 설정과 regex 기대 오류는 원 로그를 보존하고 source 변화 없이 수리했다.

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

## 명시 font closure checkpoint 검증

기본/false 준비 batch·profile 일치, 추가 폭의 word/character 재배치, hard break·ZWJ/combining
문자 단위, nested dedup·hidden/nonwrapped no-op, accessor 미실행, 사전 query/text/work 한도,
exact font binding/token/receiver/abort 및 font 교체 후 명시 재준비를 검사했다. Font capability
78개, 신규8개×지원3Node, strict types를 포함한 경계34개·최종 package/경계40개와 docs237개가
통과했다. 동적 sampled guide output은 아직 이 checkpoint의 범위가 아니다.

같은 `b9822bcd07a07bd23c93e05cc16bc58b33e32ebfb91f679853b06ee96a9507d0` archive를
Node20/22/24 각각 font public4사례·strict type·6entry bundle에서 검증했다. 실제 원본 font bytes로
새 width 줄바꿈·offline 새 process·Canvas=PNG·SVG·vector PDF를 확인했다. 최초 Node20의
Full782756>782500/Basic424051>424000 측정은 보존하고 현재 상한을782800/424100으로 최소 보정,
README/architecture를 동기화한 최종 archive를 세Node에서 다시 검증했다. Node20/24 자체 pack의
1740485>1740000도 별도 원 로그를 보존하며 compressed cap만1740500으로 최소 보정한다.
Source 새1파일과 총 unpacked7843157에 맞춘 package cap은1220/7843200이다.

[정확 입력과 원 실패/회복 증거](axis-reflow-evidence/font-closure.json)를 보존한다. 최종 source pin과
built 문서 결과는 metadata checkpoint에서 추가하며 전체 release/AT60/077를 대신하지 않는다.

Source `1507df9294d71d57137f0a7c627c596914b6bb8c` 고정 뒤 source-pin18개, built186페이지/1603 selective LLM artifact 및 전체320·390·768px/desktop 검색 검사가 종료0으로 완료됐다. 입력14개 hash와 고정 tar hash는 그대로다. 초기 system Ruby2.6/Ruby4 환경의 build 실패를 보존하며 이미 설정된 Ruby3.3으로 preflight·build·browser를 완료했다. 이 metadata 후속은 runtime/type 변경이 없다.

## Dynamic strict state foundation

`materialization/animation/axisLabelReflowState.js`는 공개 sampler에 아직 연결하지 않은 독립
준비·현재 배치 owner다. P의 안정 `c58201d21`에서 `axisLabelState.js`의 기존 네 layout exports,
`axisAnimationLabelEntries`, 실제 font/style/독립 lines proof를 받아 보존했다. 같은 파일의 native
config 준비/검증 두 함수를 private export로 추출해 fixed와 reflow가 공유한다. 계산식은 복제하지 않는다.

닫힌 layout은 channel/frame/canvas/values/mapping/config/metrics/edgeAligned/constraints다.
config.base에는 기존 고정 policy가 한 번 있으며 maxWidth/wrap/lineHeight/responsive를 추가한다.
constraints는 minPlotSize/margin/titleBounds만 가진다. 현재 native raw 값과 줄 번호로 실제 entries를
만들며 raw 값 중복은 ambiguity로 사전 거부한다. 그룹 수집기는 이후 이를 기존 guide ambiguity
fallback으로 변환해야 한다. raw 값이 비었거나 현재 skip/hidden 때문에 entries가 없어도 준비값과
실제 font binding은 남는다. maxNodes는 현재 node 수가 아닌 모든 원 문자열의 보수적인 grapheme
line 상한이다. query/work/node budget은 기존 상수이며 중간 상태에서도 적용한다.

Font 호스트 준비와 이 owner가 `axisLabelQueries`의 같은 bounded collector를 사용한다. 기본/false
호스트 경로는 그대로다. Native responsive action은 measuring pass에서 후보를 선택하고 최종 Canvas를
검증하므로 reflow도 동일 후보 선택 뒤 실제 선택 결과의 fit을 검사한다. 첫 후보의 overflow만 보고
fallback 후보를 소실시키지 않는다. Native candidate의 optional private account callbacks는 계산 전에
wrap 작업, collision loop 전에 실제 pair 작업을 기존 누적 budget에 산입하며 저장되지 않는다.

중간 raw→scale/frame/offset은 기존 Cartesian/number kernel을 사용한다. 시간 auto format은 domain이
변할 때 전체 raw 값의 explicit labelMap이 없는 한 중간 문자열을 증명하지 않고 guide-layout fallback이다.
현재 title overlap bounds가 변하는 경우도 의미가 준비되기 전 pixel 보간하지 않는다. 실제 native
후보가 중간 Canvas에 들어가지 않으면 명시 guide-layout이며 query/work 오류를 fade로 숨기지 않는다.

독립 numeric/공개 native materialization oracle는 wrap6→native3, skip에서 원 tick 재등장,
회전 선택, 현재 log Y 위치, 빈 collection/raw membership, schema2 누락 query, JSON strict복원,
40회 준비 상태 재기준 및 getter/중복/변조/작업 상한을 검증한다. 이는 authentic public frame의
rebase/offline/현재 hit 검증이 아니다. Closed group·실제 slot 수집·shared emission·현재 source proof는
다음 단계이며 공개 kernel version/지원 문구는 아직 바꾸지 않는다.

Private 준비 상태 checkpoint는 신규15개를 포함한 Node22 누적55개, Node20/24 각41개,
구조계약40개와 3owner critical floor95/90/100을 통과했다. 새 state100/96.43/100,
후보/query owner는 각각100/100/100이다. 최소 plot0 경계는 기존 native responsive Canvas
검증에 위임해 양수 계약과 일치시켰다. 같은 최종9f872a98… archive에서 각 Node의 기존
font opt-in1사례·strict types·6bundle을 확인했다. 이는 아직 연결하지 않은 dynamic sampler의
설치 검증이 아니다. 최초 cap 초과와 회복, 원 fixture/coverage 실패는
[준비 상태 증거](axis-reflow-evidence/state-foundation.json)에 분리 보존한다.

## Native group 준비와 현재 출력 검산

`axisLabelGroups.js`는 실제 graphic scopes/axis owners/collection을 읽어 `{groups,items}`를
준비한다. Layout의 실제 필드명은 `values`이고, presentation은 raw 값 순서의 `styles`와
단일 concrete `font`다. Placement는 native collection의 `insertion`, 전체 collection의
`ordinal`, concrete `frame`이다. 빈 collection에도 같은 주소가 존재하며 임의 endpoint index를
합성하지 않는다. 각 현재 item은 raw 값/실제 line 순서와 정확히 대응해야 한다.

전체 raw 값의 colorMap을 먼저 보존하고 현재 표시된 줄들의 실제 appearance를 검산한다.
같은 raw 값의 모든 줄에 공통인 opacity 등은 준비 style로 보존한다. 개별 줄만 바뀐 font/geometry/
appearance는 원 `guide-edited` fallback이며 native raw 의미를 새로 추정하지 않는다. 복원할 때
mark identity나 background 자리를 대신 차지할 수 없고, 누락/중복/순서/slot/metric/font 변조는
거부한다. Metadata의 native origin은 실제 program+childPath+ownerId+typed raw value만 WeakMap에
보유한다. 직렬화된 준비 상태가 native 권한을 생성하지 않는다.

같은 concrete offset/clip/clip-chain validator의 실제 두 소비자를 위해
`grammar/animation/placement.js`를 추출했다. 기존 `validateGeoAnimationFrame` alias/diagnostic과
rect/path/empty clip 계약은 그대로다. Parent가 2026-11-01에 이 소유 분리를 채택했다.

Public emission에서 원 timeline이 특정 raw+line의 style만 바꾸는 경우 실제 current drawing을
그대로 만든다. 그 raw의 모든 줄에서 공통 style을 증명할 수 없으면 captured group은
`guide-edited` fallback으로만 재기준한다. 모든 줄의 공통 style이면 typed 의미를 보존한다.
이는 root가 채택한 기존 primitive 편집 경계이며 새 per-line authoring 의미를 만들지 않는다.
이 부분의 public/offline/interrupt 회귀는 아직 후속 작업이다.

준비 그룹 신규11개와 관련40개 Node22 검사, Node20/24 각각 기존39개 및 최종11개를 통과했다.
새 group owner100/95.77/100, 공통 placement100/100/100으로 기존95/90/100 floor를 유지했다.
구조/package/documentation40개도 통과했다. 같은6afb6405…tar의 Node20 기존 font opt-in1사례,
strict types,6entry bundle을 확인했으며 이는 공개 dynamic reflow 설치 검증이 아니다.
추가 source2파일 때문에 package entries1229, Node22packed1757086/Node20packed1760130,
unpacked7935303을 측정해 한도를1229/1760200/7935400으로 최소 보정했다. Bundle 상한은
변경하지 않았다. 원 fixture 실패/회복과 정확 source hash는
[native group 준비 증거](axis-reflow-evidence/group-foundation.json)에 보존한다.

## 공개 동적 emission의 구현 범위와 승인 연결

기존 `AUTHORIZATION.json#remainingApproval`과 root의 2026-11-01 구체안 채택을 재사용한다.
공개 함수나 새 semantic authoring API는 추가하지 않는다. 현재 통합 기준 `d165696d6`의
timeline3/guide10/Cartesian2/GeoText2와 lane의 `retainSampledGuideMeaning` 호출을 보존하며,
동적 축 그룹 저장값은 `native-guide-values@11`로 명시한다. 구 version10을 같은 결과로
해석하지 않는다. 아래 내용은 현재 구현 중인 범위이며 최종 검증 결과는 별도 증거로 기록한다.

`axisLabelTracks.js`가 실제 group pair의 동일 raw cohort/content/font/policy를 검증하고 같은
native 후보 owner를 현재 owner progress에서 한 번 실행한다. `axisLabelFrames.js`는 실제 target
collection slot에 current raw+line 출력을 놓는다. 새 줄의 decision은 정확히
`{kind:'guide',kernel:'native-axis-label',ownerKey,guideKey,role:'guide-labels'}`이며 endpoint index를
만들지 않는다. 원 scene에 있는 줄의 style keyframe은 기존 실제 target index를 계속 사용한다.
양 endpoint에 빈 collection만 있어도 pair/scope/owner가 검증되면 geometry retime target이다.
내용이 전부 빈 labelMap은 동일 내용 계약에서 중간에도 비어 있다. Raw 값 재등장/줄 수 변화,
양끝 hidden Geo의 중간 표시와 빈 축 retime을 서로 다른 실제 경로의 증거로 구분한다.

현재 raw별 줄의 appearance가 공통이면 그 의미를 평탄하게 보존한다. 한 줄만 다른 style이면
현재 그림은 유지하고 재기준 group만 `guide-edited`로 낮춘다. 이런 sampled decision도 실제
current geometry/font/clip과 guide identity를 검산한다. Native 직접 geometry 편집이 허용된
fallback endpoint와, 이 sampler가 만들었다고 주장하는 동적 출력의 proof를 혼동하지 않는다.

Axis placement의 `geographicBefore`는 기존 GeoText.order 역할 중 이 collection 앞의 개수다.
Native collection ordinal로 검산하고, 현재 sample은 실제 emitted role을 각 한 번만 센다.
Geo body의 feature별 slot은 같은 body 역할을 중복 증가시키지 않는다. 복원은 유한 정수 범위,
전체 role 수, 순서 단조성, 실제 insertion과 모순 여부를 확인한다. 같은 slot의 빈 역할 순서는
직렬화된 닫힌 drawing 의미이며 외부 원본의 역사적 인증을 주장하지 않는다.

Shared 변경은 planner의 group 준비/codec accessor, sample의 current emission/slot weaving,
frameEndpoint의 closed decision/forward check/native source 수집, frameProvenance의 optional
axislabels 보존으로 한정한다. timelineTracks는 admitted group의 geometry owner와 실제 줄의
style 호환 판정 두 접점만 확장한다. GeoText owner에는 기존 역할의 실제 native ordinal을 읽는
private WeakMap만 추가한다. `hitAxisLabels.js`와 hitProgram은 exact program/childPath/axis/raw
membership의 원 font metrics와 guide hit metadata만 제공하며 mark selection 권한은 만들지 않는다.

0-node group도 원 native 계산 work를 쓴다. Root가 채택한 추가 경계는 sample.js의 private
`sampleTransitionWithBudget`와 frames.js의 내부 collector다. 공개 sample은 같은 helper를 사용하고,
export는 현재 axis/Geo 계산량 및 실제 output-node 방문을 기존 batch10M 안에 합산한다. 단일
sample10M/node10k와 기존 schedule10k는 유지한다. 새 public callback·host API·한도·전역 pending
state는 없다. 전체 batch 완료 전 결과가 외부로 나가지 않으며 budget 실패는 입력을 바꾸지 않는다.

Dependent title/lane의 동적 current label bounds 소비와 전체 AT60/077 통합은 이 소스 구현의
선행 검증과 구분한다. P의 refs-only current-axis dependency가 실제 최종 graphics/ink를 소비하도록
후속 union을 유지하며 지원하지 않는 의존 관계를 임의로 typed로 표시하지 않는다.


### 현재 의존 소비자와 metrics

`timeline.axisLabelGroup(ownerKey)`는 실제 owner progress에서 이미 계산한
`{graphics,labelBounds,requiredBounds,metrics}`의 frozen view를 돌려준다. graphics는 실제 줄별
keyframe patch를 한 번 적용한 출력이고 metrics는 같은 current layout의 정확 profile이다.
저장 group/placement/slot은 노출하지 않는다. P의 paint-ink consumer가 이 profile을 사용하며
native title은 labelBounds/requiredBounds를 사용한다. 후속 의존 소비자가 두 번째 clock/layout이나
옛 endpoint의 font estimate를 만들 필요가 없다. 작은 동등성 회귀는 같은 view 참조·동일 graphics·
한 번의 owner progress와 줄당 patch·exact metrics 전달을 검증한다.

줄별 style이 달라 raw 공통 의미를 증명하지 못하는 group은 actual drawing을 그대로 유지하지만
`current(ownerKey)`에서 undefined를 반환한다. 의존 lane/title가 불완전 의미를 typed로 재보존하지
않고 기존 unavailable fallback을 택하도록 한다. 원 per-line keyframe·capture drawing은 보존된다.


## 공개 component 검증 결과

공개 emission과 기존 animation 누적 coverage679개가 통과했고 11개 변경 critical owner의
95/90/100 floor를 지켰다. P 소비자 감사를 반영한 current metrics/불완전 raw-style 거부는
별도11개와 collector100/93.10/100으로 재검증했다. 이후 shared owner 누적721개도 통과했다.
GeoText ordinal reader와 guide/hit 변경은 owning supplement에서 각각 floor를 닫았다. 마지막
size interval identity의 기존 미실행 callback은 open null/finite bound와 잘못된 limit 회귀를 더해
120개/guide100·97.90·100으로 검증했다. 이는 전 repository coverage 또는 최종 AT60이 아니다.

실제 5source의 원행·원단위 cohort, 독립 현재 X 수치와 native 줄 배치, immutable/offline/SVG
검사가 canonical realistic runner에서5/5다. Exact embedded font는 현재 line 수6→3,
현재원점80/165/250을 검산했고 fresh-process network0의 scene/SVG/PNG/Canvas hash가 같다.
Canvas=PNG 및 같은 backend의 native midpoint equality, SVG font retention, vector PDF의
ToUnicode·같은run raster equality와 실제 Chromium DPR1/2 equality/lease1:1을 확인했다.

동일 archive5412d0e403cdaa398b4afd19ae0b19d6f5923140743803732d11b9abde26e7ce를
Node20.20.2/22.23.1/24.22.1에서 각3개 공개 runtime, strict animation types, 실행 문서1개,
optional peers 및6개 bundle로 검증했다. Native raw guide hit와20회 source rebase/12회 installed
rebase, zero-node retime, 전체 frame offline가 포함된다. Package는1236entries,
unpacked7,982,959bytes, packed Node22 1,768,442/Node24 1,771,737bytes이며 상한은
1236/1,771,800/7,983,000이다. Full783,644/animation327,739gzip 최대 실측에 따라
상한만783,700/327,800으로 최소 올림했다. 나머지 네 entry 상한은 그대로다.

처음 전체659개 중32실패, 그 후663개 중1실패 및 추가 font/render/browser/real fixture 오류는
원로그를 보존했다. 실제 원인·해결과 각 성공 검사는 [공개 검증 기록](axis-reflow-evidence/public-emission.json)에
분리한다. Initial archive의 Node20 bundle 상한초과와 최종동일archive3Node 성공을 합치지 않는다.
문서238중236 최초통과/생성provenance·runtime reference2 stale은 generator로 갱신 후 owning20개가
통과했다. Source pin과 changed-page browser는 후속 metadata commit으로 별도 기록한다.


### Source pin 마감

공개 source `0811878a9500f2637e1ea60a1e4d40eb352f8370`를 원격에 고정한 뒤 동일37개
source/test/fixture 입력을 Git blob과 검산해 delta0을 확인했다. Source-pinned 문서 owning49개,
Jekyll186페이지/LLM1603개 링크·hash 검사 및 변경 animation page320/390/768/1280px의
overflow0/axe0/console0가 통과했다. 최초 임시 browser probe의 `.html` 경로는 실제 pretty
permalink `/api/animation/`로 바로잡았으며 site source 변경은 없었다. 이 metadata 후속은
라이브러리 runtime/types 및 동일5412 archive를 바꾸지 않는다.
