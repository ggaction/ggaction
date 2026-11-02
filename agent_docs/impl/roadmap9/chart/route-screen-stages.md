# B native update: Canvas와 screen 경로의 private 단계

## 범위와 승인

기존 [v2 채택](route-v2-adoption.md)과 [native 단계 추출](route-native-stages.md)을 이어간다.
Root는 2026-11-02 기존 exact-constructor `canvasResourceRevision` handler에 `prepareStages`를
함께 등록·조회하는 최소 내부 연결을 기존 승인 범위로 채택했다. 기존 prepare/apply와 native
plan 권한을 보존하며 상속 fallback·generic replay·새 public registry를 추가하지 않는다.

원 screen-route preparation loop를 generator로 추출하고 원 `plans`와 `calls` WeakMap을 그대로
사용한다. 각 viewport의 exact native job/completion 뒤 원 route/Geo closure와 검산을 마치며,
apply는 같은 원 primitive context를 통과한다. Private route scope를 primitive context로 전달해
그 apply 검산 비용도 같은 ledger에 누적한다. 중단 신호는 적용 직전 다시 검사한다.

공통 Canvas registry의 synchronous `prepare` 경로는 유지한다. 명시 private scope가 있을 때만
정확히 등록한 생성자의 `prepareStages`를 호출하며 lookup은 새 권한이나 proof가 아니다.
Canvas edit, guide overflow loop, responsive pass는 기존 locals와 순서를 유지하는 generator를
공유한다. 기존 v1 wrapper는 host timer 없이 즉시 소비하고 모든 의미 있는 기존 child action은
원 wrapped action으로 수행한다. Basic shared modules에 graph/solver/host import를 추가하지 않는다.

## 검증할 불변식

- Fixed Canvas, responsive native pass, exact-inner plot의 v1/v2 concrete geometry 정확 비교.
- 원 program 보존, 원 iteration/overflow limit과 transient context 복원.
- screen plan exact receiver, 한 번 사용, 위조 primitive 거부 및 abort 시 publication 없음.
- prepare/apply의 누적 work, hash buffer 해제 및 exact-class registration-once/상속 격리.
- Node20/22/24 owning 회귀와 기존 critical floor, source-free 동일 설치 archive/browser 확인.

## 남은 전체 의무

이 checkpoint는 private 준비 단계다. Public `kind:update`/`applyGraphEdgeRoutesUpdate` 및 전체
B native union은 아직 연결하지 않았다. `fitCanvas`의 probe가 호출하는 wrapped `editCanvas`,
data identity와 composition/facet, heterogeneous policy admission 및 held-result sample 수명은
상위 native owner 연결의 후속 의무다. 원 332개 후보 감사표를 runtime allowlist로 쓰지 않는다.

현재 generator가 돌려주는 private candidate는 준비 중 실제 bounds 검산에만 쓰이며 최종 public
결과를 직접 반환하는 권한이 아니다. 최종 wrapped action/theme completion/원 primitive 권한을
보존하는 연결이 끝나기 전에는 B 완료로 세지 않는다. 전체 100ms와 원 1k/10k capacity 완료 역시
주장하지 않는다. Snapshot/clone/postMessage/최종 geometry·materialization의 동기 구간은 남아 있다.

## 검증 결과

- Node20.20.2/22.23.1/24.22.1 각각1,422개 owning 회귀 통과. Core encoded cursor/jsonText/valueEncoding,
  screenRoutes, preparedResourceContext, canvasResourceRevision, guides/layout은 모두100/100/100.
  responsiveLayout은100/93.75/100, routeClosure는100/97.44/100이며 기존 critical floor를 유지했다.
- Fixed Canvas의1job, responsive 원2pass 각각의 job, exact-inner plot margin 변경1job이 원 v1의
  `graphicSpec`·Canvas config·context와 정확히 같다. 원 program 보존, receiver mismatch, one-use
  screen plan, 위조 primitive 호출, abort와 hash buffer 해제도 검증했다.
- 동일 source-free archive SHA256 `56ad20e76e1f47b8ed33632b4af3b0e8d77ffc54a53fcf51b7c10f1abeb22ff4`:
  1266entries, packed1,824,540B, unpacked8,200,714B. 세 Node에서 public8cases/types/6bundles와
  private native stages/registry9cases를 각각 실행했다. Private 파일 테스트는 설치 archive 내부
  module URL만 사용하며 이를 public API 지원으로 해석하지 않는다.
- Full 최대gzip793,093B, Basic426,399B, graph74,464B. Worker38source modules/Full·renderer 유입0,
  Basic의 screen owner/route job/host/route materializer 정적 유입0을 확인했다. Package ceiling은
  최소 올림1,824,600/8,200,800B, Full/Basic gzip은793,100/426,400B로 조정했다.
- Chromium 실제worker·Canvas·SVG·restore와 정확 문서 snippets를 같은 archive에서 검증했다.
  Worker 종료·listener0·취소 publication0 확인. 문서/타입/package/source/discovery83개 통과.
- 처음 누락된 기존 `createCanvas` sync import로 Canvas 검사1개가 실패했고 복구 후 재검증했다.
  후속 critical 감사에서 retained sync route helper의 직접 회귀를 보강하고 세 Node 전체를 재실행했다.
  Archive pin 첫 검산은 가이드 모듈의 기존 `keepNames:false` 압축 옵션을 evidence helper가
  누락하여 실패했다. 원 package 압축 옵션과 일치시킨 뒤 exact bytes 검산을 통과했으며 제품을
  바꾸지 않았다. 실패 로그는 raw receipt에 보존한다.

검산 명령은 `node agent_docs/impl/roadmap9/chart/route-screen-stages-evidence/verify.mjs`이며,
[qualification](route-screen-stages-evidence/qualification.json)이 source와 archive/압축 raw receipts를
결박한다. 공개 B update, 전체 union, fit/composition/data 연결, 큰 capacity 및100ms는 미완료다.

검증 source commit은 `cbf7bbf4410a3c2e7b30a90dfc5c4bddeb3da4ad`이며 후행 metadata pin은 실행 bytes를 바꾸지 않는다.
