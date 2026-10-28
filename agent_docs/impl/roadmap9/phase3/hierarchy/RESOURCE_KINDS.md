# Builtin resource 검증 경계

## 진행 상태

- [x] H 설계의 private registry 경계 승인 재사용
- [x] once/exact-constructor/closed handler 계약과 primitive·graph·prepared·restore 검증 연결
- [x] getter 미실행·caller 수정 격리·Basic/상속/미등록 거부·stale/cycle/원자성 회귀
- [ ] 각 hierarchy/layout/image handler와 Full assembly의 단일 등록 연결
- [ ] public resource/action/plot 및 모든 소비자 구현

`PUBLIC_APPROVALS_20261028.json`의 H revision928fba48 승인과 마지막 전체 STEP077 승인에 근거한다.
새 사용자 확인을 요구하지 않는다. 이번 checkpoint는 승인된 내부 경계 준비이며 hierarchy/image의
공개 지원 완료나 STEP020 완료가 아니다.

`registerBuiltinResourceKinds(ProgramClass, handlers)`는 정확히
`{validateStored(resource), validateBindings(program, resource)}` 두 함수를 가진 trusted owner를 받는다.
Hierarchy/layout/image만 builtin 후보이며 공통 persistent-selection/parameter/data-source 검증은
기존 owner가 유지한다. Class별 WeakMap에 복사·freeze한 null-prototype record를 보관하고,
중복 등록은 거부하며 superclass fallback·공개 export·unregister·변경 기능은 없다.

공통 envelope/typed reference/provenance 뒤 stored handler를 호출하고, graph의 존재·revision·cycle
검사 뒤 binding handler를 호출한다. Prepared resource도 동일 shape와 binding 검증을 수행한다.
`validateStoredResource(resource, ProgramClass?)`, `validateResourceGraph(program, ProgramClass=program.constructor)`가
capability를 전달한다. Primitive의 plain spread preview는 원 constructor를 두 번째 인자로 전달한다.
Constructor가 없는 envelope는 추가 kind를 수락하지 않는다. Restore는 실제 ChartProgram을 만든 뒤
동일 검증을 호출하므로 backend·host·layout 계산이 없다.

Image owner와 합의한 export는 `materialization/imageState.js`의 `imageResourceHandler`다.
각 owner가 개별 등록하지 않고 Full assembly에서 hierarchy/layout/image handler map을 한 번 등록한다.
이 초기 commit에는 실제 public owner가 아직 없으므로 Full에도 추가 kind를 등록하지 않는다.
Internal kind vocabulary의 준비는 public declarations나 Current 지원을 앞서 확장하지 않는다.

원시 실행 로그는 `.artifacts/builtin-resource-kinds*.log`, `builtin-resource-regressions.log`,
`builtin-resource-contracts.log`에 둔다. 신규 registry는 focused line/branch/function100%이며 기존
global/critical floors는 유지하고 registry에95/90/100 floor를 추가했다. 최종 package 실측과
회귀 수치는 다음과 같다.

- Resource/core/persistence/primitive/prepared source 회귀102/102, source/coverage/package boundary17/17 통과.
- Node20.20.2/22.23.1/24.22.1와 동일 npm10.9.8로 같은 staging을 측정했다. Entry739,
  unpacked5,056,470bytes, packed최대1,098,083bytes다. 기존738/1,098,000/5,054,000 실패를
  보존하고739/1,099,000/5,057,000으로 최소 조정한다.
- 같은 minified bytes의 Full/Basic/SVG 최대gzip535,560/313,517/8,185bytes는 기존
  537,000/315,000/25,000 한도 안이며 변경하지 않았다. TarSHA는 세 runtime에서 같다.
- Raw measurement와 테스트 로그는 이 기록의 `resource-kinds-evidence`에 보존한다.
