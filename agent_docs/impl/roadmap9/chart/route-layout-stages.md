# B native update: 그래프·계층 resource 단계

[기존 native continuation 채택](route-native-stages.md)과 [Canvas 단계](route-screen-stages.md)의
후속이다. 원 `graphs/layouts`와 `hierarchy/resources`가 검증·resource DAG·후속 materialization의
locals를 계속 소유하며 명시 private scope에서만 route job/completion을 기다린다. 기존 동기
진입점은 같은 generator를 즉시 소비한다. Public B action/handle이나 새 인증 registry를 만들지 않는다.

- `editGraphLayoutStages`: 원 node patch/options 검증, dormant 좌표 보존, 새 layout, route/Geo closure,
  GraphPlot/flow preflight, 원 primitive binding과 wrapped materialization 순서를 유지한다.
- `prepareGraphResourceStages`: inferred graph DAG, next layout Map, 원 source replacement Map,
  route closure와 consumer preview를 소유한다. `writePreparedGraphResource`는 기존 write owner이며
  private plan의 scope로 원 primitive 검산 비용을 이어서 누적한다.
- `writeHierarchyResourceStages`와 `editHierarchyLayoutStages`: 원 hierarchy/layout 계산, partition
  focus recovery, route preflight, 원 primitive context와 wrapped plot/selection materialization을 유지한다.
- Projected graph write에서도 원 projected primitive authority에 같은 ledger를 전달한다. 옵션이나
  persisted state에 scope를 저장하지 않는다.

## 원 actionSource 수명 경계

`graphSourceRevisions`와 `graphSourceProjection`은 원 `actionSource`에 등록된 active wrapped
invocation만 읽는다. `writeGraphResource`는 이 원 동기 호출을 유지한다. 이를 iterator로 바꾸어
await 뒤 다시 조회하거나, source-context를 임의 receiver/복제 proof로 대체하지 않는다. 상위 준비
owner는 정확한 입력/소스 문맥을 원 수명 안에서 확보해야 한다. Native 준비 테스트는 권한을
흉내 내지 않고 기존 prepare/write pair를 사용한다.

## 남은 의무

이 단계는 private native preparation 연결이며 public `kind:update`나 전체332후보 인수를 뜻하지
않는다. Fit probe의 최종 wrapped plan, source identity/data application, composition/facet,
heterogeneous admission과 held-result sample 수명, 전체 final actionStack/theme completion은
상위 B 연결의 후속 의무다. Snapshot/clone/postMessage/materialization의 전 구간100ms 및
원1k/10k capacity 증거도 아직 없다. 기존 수치·guard·hierarchy anchor 검사·v1 sync/hash는 유지한다.

## 검증 결과

- Node20.20.2/22.23.1/24.22.1 각각298개 owning+route/core 회귀 통과. Core cursor/jsonText/valueEncoding은
  100/100/100, graph layouts100/98.72/100, hierarchy resources100/96/100,
  preparedResourceContext100/100/100이다. 원 critical floor를 낮추지 않았다.
- 원 v1과 graph node/layout 변경·graph input 재계산·hierarchy/layout revision의 `graphicSpec` 및
  route provenance를 정확 비교했다. 모든 관련 revision이 한 번 오르고 원 program이 보존된다.
  적용 검산의 추가 ledger 비용과 준비 후 abort 거부를 확인했다. 잘못된 order와 hierarchy anchor
  mismatch의 기존 오류도 유지한다.
- 공통 archive SHA256 `887ad680aa8ad6b6ab733ed4006ec25967e07fbc17562033c1833401e5d0d784`:
  1266entries, packed1,824,712B, unpacked8,201,674B. 세 Node public8cases/types/6bundles와 설치된
  private native 단계/registry11cases를 검증했다. Chromium realworker·Canvas·SVG·restore·정확 문서
  snippets 역시 같은 archive를 사용한다. Worker38source modules와 cleanup/listener0을 유지한다.
- Full 최대gzip793,222B, Basic426,399B, graph74,464B. 최소 올림으로 package ceiling을
  1,824,800/8,201,700B, Full gzip793,300B로 조정했다. Basic/graph/worker 경계는 유지한다.
- 문서/타입/package/source/discovery83개 통과. 첫 native 테스트에서 active actionSource 밖의
  write wrapper 호출과 서로 다른 hierarchy anchor를 fixture가 잘못 사용하여 실패했다. 원 권한과
  anchor guard를 완화하지 않고 native prepare/write pair와 일치하는 anchor fixture로 수정했다.
  실패 raw receipt를 보존한다.

검산: `node agent_docs/impl/roadmap9/chart/route-layout-stages-evidence/verify.mjs`.
[qualification](route-layout-stages-evidence/qualification.json)은 source bytes, 공통 archive와
압축 raw receipts를 결박한다. Public B/전체 union/final actionStack·theme/data·composition/fit/
전체100ms/원 large capacity는 미완료이며 이 checkpoint가 대체하지 않는다.
