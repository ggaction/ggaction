# 명시 hit preparation 정책 checkpoint

## 범위와 승인

[구체안](HIT_CAPACITY_PROPOSAL.md)과 기존
[포괄 승인](../AUTHORIZATION.json#remainingApproval)을 재사용한다. `93d1c1109`를 기준으로
진단 commit758을 옮긴 뒤 구현했다. 사용자 중단 요청(11월1일) 때 WIP를 보존했으며
11월2일 재개 지시에 따라 동일 runtime/type 입력으로 검증을 계속했다.
정책의 현재 공개 계약은 [INTERACTION](../../../contract/current/INTERACTION.md)이 정본이다.

정책 연결과 아래 Node20 blocker로 채택된 exact-object metadata 재사용, 같은 호출의 circle 명령 재사용,
private geometry container의 중복 복사 제거, shared path 계산과 기존 owned facade의 분리가 이 checkpoint의 대상이다.
Scene proof와 서로 다른 호출의 geometry shape 공유는 아직 구현하지 않았다. Native data/selection/query/animation
한도를 바꾸거나 identity를 줄여 100k를 허용하지 않는다. Binding과 index는 독립 준비 예산이다.

## 현재 검증 상태

- Source: `00e8ac18ef8612f3c62d1b3340fababd680dd745`.
- 같은 archive `1dc38ce6acb158e637c0991aa15aa158182a2325f4aafbe45ff3818fd62c6e8e`의
  Node20/22/24 각각 원100k·원자적 교체2case,strictTS,실행doc,optional peers를 통과했다.
  Node22/24는6bundle까지exit0이다. Node20 최초Full cap실패는 보존하고 같은6측정값의
  최소cap 재검산을 별도 통과했다.
- 원99개 전체 private state/command/query/work exact. Source focused1264/1264 및10hit owner
  95/90/100 floor, shared path 기존80/75/80 floor 통과. 이후 추가 extreme 회귀 포함 path11개×3Node 통과.
- 동일 설치물 production Chromium의100k 전수/9CSS/DPR1·2가2/2 통과했다.
- Source pin 후docs22/22,Jekyll build,186page/1603LLM hash 및 변경interaction페이지4폭/Axe 통과.
  Built search 한도 최초실패와 최소cap에서 동일built 재검산을 구분했다.
- 이는 명시 정책의 기능 checkpoint이며 최종성능SLO/P95,통합전체,전체로드맵 완료가 아니다.

## 초기 정책 검증과 원 실패 기록

- 기존 기본 거부, 명시 허용, 작은 정책으로 다시 검사, borrowed/clone/frozen frame 거부,
  중첩 합계, 실패한 교체·history·sample 원자성을 포함한 원 정책 hit-testing337개 통과, metadata proof 포함 재검증342개 통과.
- 원 정책 focused1155개 및 metadata proof 포함 변경9owner focused1160개 통과. 이9owner의95/90/100 floor를 모두 만족했다.
  최종 aggregate100/95.84/100이며 whole-repository coverage는 아니다.
- Strict interaction declaration 통과. Package/source/discovery/type 계약 첫 실행38/39 중
  유일한 실패는1245entries가 기존1244cap을 넘은 것이다. 실측1245/최대1789653/8056862에
  최소 ceiling1245/1789700/8056900을 적용한 package owner7개가 통과했다.
  Metadata proof 최종 source는1245/최대1789984/8057659로 재측정했고
  최소 ceiling1245/1790000/8057700에서 타입/package/source/discovery39개가 통과했다.
- 새 공개 문서 snippet은1개 실행 통과. Pin 전 docs27/28의 유일한 실패는
  `docs/_data/provenance.json` stale이며, 최종 source pin 후 재검증한다.
- Node24 source 단발 diagnostic은 original100000items/100001scene와 모든 좌표를 검사하고
  default guard 우회 없이 explicit policy로 session 준비44375.9515ms를 관측했다.
  Timing은 기능 admission의 단발 관측이며 P95/SLO 통과를 뜻하지 않는다.
- 동일 archive 설치물의 원100k/9CSS, strictTS/doc/peers/6bundles 및 ChromiumDPR1/2는
  아래 archive별로 성공·중단을 구분하며 최종 source 전체는 아직 완료로 기록하지 않는다. 원본 archive SHA는
  `ee61951c61f6445014f8eb7ff902d2691ef7b2dea960f80de098c5ab9c721248`이다.

## 남은 검증과 의무

이 기록의 현재 기능 checkpoint는 고정 archive 세Node와 실제browser, 문서pin까지 검증했다.
원100k fixture/9query/DPR와 full row lineage는 그대로 유지한다. 긴 준비시간·메모리와 마지막
combined candidate의 전용CPU P95/SLO는 후행이다. Scene proof와 호출간 shape 재사용은 추가하지 않았다.
원 diagnostic의 카운터0은 instrumentation을 로드하지 않은 값이지 실제 work0이 아니다.

## 11월2일 검증 중 드러난 blocker와 최소 수리

원 archive Node20의100k case는 default4GiB heap/GC개입0에서10:20까지 끝나지 않았다.
OSsample은 WeakSet→EphemeronHashTable 재정리를 보였으며 parent 지시에 따라 해당 child만
SIGTERM으로 중단했다. 원 elapsed/CPU9:50.92/receipt는 실패·중단으로 보존하고 pass로 세지 않는다.
이 관측으로 parent는 검증에 필요한 exact metadata proof 최소 수리를 정책 checkpoint에 포함하도록
허용했다. `hitIndex.metadata`는 최초 own-data/ref/uniqueness 전체검증 후 canonical field order와
모든 descendants의 ownership이 확인된 객체만 원참조를 보존한다. Info/semanticKey/signature/기존
conservative cost를 exact object WeakMap 한 곳에 보관하고 매 현재정책에 같은비용을 다시 과금한다.
Caller/clone/frozen/shallow-owned tree는 full validation과 isolation을 유지한다. Scene/shape/source/
asset/query 검증은 그대로이고 core WeakSet·heap·fixture·SLO는 바꾸지 않는다. 작은 기존값248work의
최초/반복·247실패와 mutabledescendant/다른fieldorder/semanticconflict/forgery가 독립회귀 대상이다.

## 동일 archive 중단의 구분

- 원 ee619 Node22도10:18/CPU9:17.80에 첫100k case가 끝나지 않아 해당 child만 종료했다.
  원 Node24의2runtime 성공이 Node20/22 성공을 대신하지 않는다.
- Metadata proof를 포함한 c362 새 archive의 Node20도10:15/CPU9:17.14에서 중단했다.
  이 기능진단 중 다른 owner의 큰 메모리 작업이 있었으므로 runtime 차이의 성능 비교는 하지 않는다.
  Metadata proof 회귀/정확 비용은 통과했지만 source 전체 admission blocker를 해소하지 못했다.
- Root 지시에 따라 다음 단계는 source guard/heap을 바꾸지 않는 loader attribution이다.
  같은 설치물의 실제 공개100k case에서 semantic owner별 호출/완료, clone/owned 객체 생성,
  기존 binding/index 과금을 따로 기록한다. 작은 공개 atomic case는 이 계측하에서도 통과했다.
  최종 coherent source/package/browser qualification은 아직 미완료다.

## 실제 JavaScript attribution과 같은 호출의 circle 경로 재사용

c362 설치물의 원 공개 100k/9CSS 사례를 Node24 loader 계측으로 끝까지 실행했다. Guard·수식·heap·입력·GC
개입 없이 source SHA와 semantic owner별 호출/owned 객체 생성/기존 과금을 기록했으며 54437.594916ms에
공개 assertion이 통과했다. 이는 계측한 단발 기능 증거이며 정규 세Node 설치나 P95/SLO 성공이 아니다.
원본은 `.artifacts/hit-preparation-attribution-100k-node24.{jsonl,log}`에 보존한다.

create+mount에서 prepareHitShape 200000회, circleCommands 400000회가 실제 완료됐다.
circleCommands의 ownedAdds는14400000, prepareHitShape의 exclusive ownedAdds는13600000,
compilePath는10200000이었다. metadata의 첫 검증은100000회이고 index metadata200000회는
추가 clone0/owned0으로 기존130511120work를 그대로 과금했다. 원 identity 검증 비용13188890도 유지됐다.

Root는 이 근거로 `compileGeometry`의 private 마지막 `preparedPaths` 인자만 채택했다.
동일 prepareHitShape 호출에서 normalize한 circle의 최초 명령을 fill에 다시 전달하며, stroke/clip의
별도 circle과 모든 analytic-circle/close/subdivision/compilePath 검증·원work·scalar 순서는 유지한다.
외부 caller가 경로를 주거나 다른 호출의 값을 재사용하는 권한은 추가하지 않는다. 기존 중단/attribution
로그는 보존하고 명령·hit·distance·소유 객체 생성량 동등성 검증과 새 고정tar 세Node 원100k를 별도로 기록한다.

Attribution JSONL SHA256은 `67dbdf3be68513aebdab3285ef7da90d5c14c5c2d45bf8053f9ba67d59a47a66`이다.
같은 입력의99개 circle/변환/clip/opacity/empty/outline/shadow/negative-zero 사례에서 수정 전후 private
state의 모든 명령과 query hit/distance, 원work가 deep-equal이었다. Circle 명령 호출750→715,
그 owner의 ownedAdds19192→17644만 감소했다. 비교 receipt SHA256은
`723fe771ec4c681f6c8b111a0052fe6f371b02e529de9731a59c8c720cb5b7dc`이다.
이 비교는 이전 source를 ignored loader에서 읽었으며 product test는 역사 파일을 import하지 않는다.

수리 후 focused1162/1162 및10개 변경 owner의95/90/100 floor를 통과했다. HitShapes는
100/94.83/100, aggregate는100/95.70/100이다. Package/source/discovery/type45개도 통과했다.
새 literal test 첫 실행의 clip 밖 nearest 예상값10은 기존 fail-closed 계약인Infinity로 수정했고
원 실패 로그는 별도 보존했다. 런타임 clip 동작은 바뀌지 않았다.

새 archive `691dfd9c793c2eadb230bb1976333871e754dfa1e8b608a340f84b42214b06c6`는
c362 대비 src/types 중 hitShapes.js만 바뀌었다. Node20은10:25/CPU10:14.26에 첫100k case가
끝나지 않아 exact child33229만 종료했다. Runtime은 미완료이며 success로 세지 않는다.
StrictTS/doc/peers/5bundle은 통과했고 interaction136584가136000을 초과한 원본을 보존했다.
최소cap136600에서 같은 측정값을 별도 재평가한다. Root의 다음 대형 작업을 위해 슬롯을 반환했으며
Node22/24 원100k 및 Chromium은 아직 실행하지 않았다. 추가 동일10분 반복 대신
[실제 circle 소비자 감사](HIT_CIRCLE_CONSUMER_AUDIT.md)를 진행한다.

## Private geometry container assembly

위 감사에서 native nearest/bounds/clip anchor는 실제 flattened commands를 소비함을 확인했다.
Analytic 대체는 기존 수치와 달라 채택하지 않았다. Root는 대신 `prepareHitShape` 마지막의
private state tree에만 적용하는 bounded freeze/assembly를 채택했다. 내부 새 parts/commands/bounds는
직접 freeze하고, caller에서 온 transform은 각 저장 위치에서 기존 cloneAndFreeze로 격리한다.
외피의 owned gate·states WeakMap·compilePath·원 guard/charge/스칼라 순서·core ownership은 그대로다.
모든 field 출처와 비노출·alias·변조 반례는 위 감사 record 한 곳에 기록했다.

원99 matrix의 전체 private state/commands/query/work는 수정 전과 deep-equal이다.
이 입력의 prepareHitShape ownedAdds38183→12254, object clone allocations32294→8161이며,
외부 transform 격리를 유지하기 때문에 clone 함수 호출 감소를 주장하지 않는다. 새 alias/caller 변경/
연속 준비/가짜 외피를 포함한 literal14개와 focused1164/1164가 통과했다. 변경10owner는 모두
95/90/100 floor를 만족했고 hitShapes100/95.38/100, aggregate100/95.78/100이다.
이 source의 원100k는 Point 예약이 끝난 뒤 새 archive로 검증한다. 앞선 중단과 P95 미달은 그대로 유지한다.

동일 source의 Node20/24 작은 geometry/proof/policy 회귀는 각24개 통과했고,
타입/package/source/discovery는45/45 통과했다. 최종 package 관측은 세Node 모두1245entries,
unpacked8058435이며 packed는 Node20/24 1790206, Node22 1786733이다.
최소cap1245/1790300/8058500으로 정합했다. 새 archive는
`6849e5917faaa1b0a2c8d5acd1fc00bebedabe3ba9335d272ec9823a3b3477bd`이며,
아직 그 archive의100k 설치 검증이 끝났다는 뜻은 아니다.
Focused coverage log SHA256은 `55e6f1319fc798ec645175d2165e18b9fe9441b58a2c54f2bd3e9f464d81f849`다.

6849 archive Node20 원100k도10:17/CPU10:10.00까지 첫 사례가 끝나지 않아 exact child48047만
SIGTERM으로 중단했다. 원 fixture/default heap/GC개입0이며 runtime pass0이다. 3초 OSsample은
WeakSet→Ephemeron Rehash가 주표본이었다. `.artifacts/hit-private-assembly-node20-interrupted.json`과
동명의 sample/log에 원본을 보존했다. Private assembly는 작은 exact 검증에는 통과했지만
실제100k 준비 지연 해소는 입증하지 못했다. Node22/24와 Chromium은 시작하지 않았다.
같은 archive의 strictTS/doc/peers/5bundle은 통과했고 interaction136660의136600cap 최초 초과를
보존했다. 최소cap136700에서 같은6bundle 측정값만 별도 재평가했다. Runtime 중단 결과는 바꾸지 않는다.

## Shared path 계산과 기존 owned facade 분리

Root가 채택한 구체안은 [circle 소비자 감사](HIT_CIRCLE_CONSUMER_AUDIT.md)에 고정했다.
같은 pathGeometry owner의 입력 검증·수학·스칼라 순서·subdivision/command/point guard를 그대로
실행하는 raw 계산과 기존 deep-frozen/owned facade만 분리했다. Hit 준비의 compilePath/circleCommands/
stroke 세 내부 호출만 새 raw tree를 소비하며, 기존 private assembly에서 freeze한다. Trail, query,
distance, renderer의 기존 facade와 core ownership은 바꾸지 않았다. 외부 입력 alias는 보관하지 않는다.

Source focused1264/1264가 통과했다. 기존 hit 관련10owner는 모두95/90/100 floor를 만족했고,
추가 shared pathGeometry 전체는94.41/95.81/100으로 기존 canonical80/75/80 floor를 만족했다.
HitShapes는100/95.38/100, 전체11owner aggregate는99.29/95.78/100이다. Path owner를95% line
floor 통과로 확대하거나 whole-repository coverage로 보고하지 않는다. Coverage log SHA256은
`254d9aecf3cfbbb8ba1ad757773707f716b34a68c1797f5f6464e3f288b86ae3`이다.

같은 source의 path/Trail/hit 작은 회귀61개는 Node20/22/24 각각 통과했다. 기존 극단 bounds/curve
supplement18개도 통과했다. 이후 새 raw/owned 양 경로에 extreme cubic의 정확 bounds와 normalized
subdivision, maxDepth1의 literal points/diagnostic, transform/segment/arc overflow 거부 회귀를
추가한 path 파일11개가 세Node 각각 통과했다. 원1264 결과를 새 테스트까지 재실행한 것으로 쓰지 않는다.
원99 matrix의 전체 state/commands/query/work는 exact이고 receipt SHA256은
`d5690114ef6e771dd039fbe0c3daa0baa27f299b26be5610088038626506c5ad`다.

최종 package 관측은1245entries/8059160unpacked, packed Node20/24 1790460 / Node22 1786971이다.
실측 최소cap1245/1790500/8059200으로 정합했다. 새 archive의 원100k 설치 검증과 Chromium은
Point의 직렬 예약 반환 후 별도로 실행한다. 기존 중단 네 입력과 성능 SLO 미달은 그대로 유지한다.

최신 source의 타입/package/source/discovery45/45와 documentation-truth3/3이 통과했다.
새 고정 archive SHA256은 `1dc38ce6acb158e637c0991aa15aa158182a2325f4aafbe45ff3818fd62c6e8e`다.
이 archive의 원100k Node20 두 공개 사례는 Point 슬롯 반환 후 단일 child로 시작했다.
완료 결과는 후속 receipt에 따로 기록하며, 시작 자체를 기능 또는 성능 성공으로 세지 않는다.

1dc38ce6의 Node20 원100k 사례는104105.671833ms에 자연 완료했고 모든100000좌표/row lineage,
100001scene node, 기본정책 거부 및9CSS query의 전체 후보/순서를 통과했다. 두 번째 policy/atomic
교체 사례도41.720292ms에 통과했다. 원 default heap/GC개입0이며104초는 기능 admission 증거다.
성능 SLO/P95 통과로 세지 않는다. 실행 중1:25 관측의RSS는1786784KiB였으며 최대값 또는JS heap
측정이라고 주장하지 않는다. 기존 네 차례의10분 이상 중단은 별도 source 결과로 보존한다.

같은 설치물 strictTS/doc/peers와5bundle은 통과했다. Full gzip784329가784300을29bytes 초과하여
최초 harness는exit1이고 원qualification/log를 보존했다. 최소cap784400과현재 architecture table을
정합한 뒤 저장한 동일6bundle 측정값만 재검산해 통과했다. Runtime을 재실행하거나 실패기록을
덮지 않았다. Node22/24 및 Chromium은 다음 CPU 슬롯 조율 뒤 진행한다.

Root가 후속 직렬 슬롯을 허용한 뒤 같은1dc38ce6 archive로 Node22와24를 차례로 실행했다.
각2runtime/strictTS/실행doc/optional peers/6bundles가 모두 통과해exit0이었다.
원100k 사례는 Node22 70106.612791ms, Node24 25438.064958ms였다. D의 별도small100 기능검사가
동시에 있었으므로 이 값들을 엔진 간 성능 비교로 쓰지 않는다. 각 원receipt는
`.artifacts/hit-private-calculation-installed-{20,22,24}/`에 보존한다.

그 뒤 Node22 동일 설치물에서 production minified bundle을 만들고 실제 Chromium을 직렬 실행했다.
DPR1/2 각각100000 Canvas arc 호출,100001 scene node,모든 좌표,9CSS query의 전체 후보·row lineage·
순서 및원2M query 한도를 통과했다(2/2exit0). 관측 query work최대4161이다. 양DPR의 원input SHA256은
`b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`이며 actual scene hash는 각각
`0733fa16cb808c9236b154e81eb1bc82cafedd590245638213e2683b1544e1ca`와
`d6c80c0cbd8cfb30e76e8a73a8e3638a168ac0cfbf5e41621e23de71b7a71dff`다.
Scene의 실제 native identity가 포함된 해시를 그대로 기록하며DPR간 동일hash를 주장하지 않는다.
원fixture/heap/GC/수학/guard/과금은 유지했다. 전체 설치·browser 프로세스는 종료했으며,
전체로드맵/최종release/성능SLO/P95의 완료를 선언하지 않는다. 다음은 이 source에 대한 문서 pin이다.

## 문서 pin과 마지막 정합

문서 provenance는 source00e8ac18e의 정확 src/type fingerprint에 고정했다. Pin 후doc/source22/22,
Jekyll build와변경interaction페이지1440/320/390/768의containment·Axe·완료anchor·console검사가
통과했다. 최초built 정적검사는search-index1091898bytes가1091300cap을 넘어 실패했고 원log를
보존했다. 새정책문서의 실제크기에 최소cap1091900만 적용해 동일built의186page/1603LLM hash
검사를 재실행하여 통과했다. Runtime/type/packed 입력 변화0이며 archiveSHA는 그대로다.

최종 package ceiling1245/1790500/8059200, bundle ceiling은Full784400/Basic424700/SVG26000/
graph46000/animation333800/interaction136700이다. 원 runtime 중단과 Full/search cap 실패를
삭제하지 않았고, same-measurement/owning 수리를 전체 최초green으로 쓰지 않는다.
