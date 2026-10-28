# 준비된 resource 결과와 data revision 경계

## 진행 상태

- [x] 승인된 H final-envelope 계약 및 기존 DATA 권한 경계 재사용
- [x] exact receiver/args, 중첩 복원, 모든 종료 cleanup 구현
- [x] class별 단일 data-backed resource revision 위임과 Basic 격리
- [x] 기존 DATA/parameter 및 구조 경계 회귀
- [x] 지원 Node package/browser 측정 최종 기록

H 공개 구현과 graph 후속 연결이 공유하는 private checkpoint다. H의 공개 9 actions/plot 지원은
이 checkpoint에 포함하지 않는다. 기존 H 설계와 사용자의 STEP077 전체 승인 범위에서 실행하며,
새 승인이나 별도 public API를 추가하지 않는다.

`actions/primitives/preparedResourceContext.js`의
`withPreparedResourceResults(program,args,replacements,operation)`은 exact program/args에만
최종 dependent 결과를 결박한다. 각 replacement는 exact previous ref와 next-revision resource이고,
등록된 kind validator를 먼저 통과해야 한다. Reader는 `actionSource(enteredProgram)`을 비교해
같은 상태로 복제한 receiver나 복사 args도 권한으로 수락하지 않는다. 중첩 호출은 이전 결박을
복원하고 throw/정상 종료 모두 권한을 제거한다.

Primitive는 parameter→data-source 또는 hierarchy→layout 관계만 허용하고 이전 options,
입력 revision vector, ownership, 다음 revision을 확인한다. 순수 구조 갱신과 결과 재계산을
섞지 않고 domain owner가 계산한 final envelope만 같은 semantic transition에 적용한다.
각 kind의 binding/result 검증 권한은 기존 registered handler에 남는다.

`actions/data/resourceRevision.js`는 exact constructor별 한 번만 `{kinds,revise}`를 등록한다.
Closed own-data handler를 복사·freeze하고 superclass fallback을 두지 않는다. Generic data-ref
rebinder는 등록 kind를 건너뛰며 revision plan이 해당 domain revise 함수를 명시 호출한다.
아직 handler를 등록하지 않은 Full/Basic 동작은 기존과 같다. H 연결은 다음 public checkpoint에서
등록하며 graph는 그 도메인의 kind/함수를 같은 assembly 경계에 추가한다.

검증 원본은 `.artifacts/hierarchy-common-checkpoint/`에 보존한다. `unit.log`는 exact resource
권한/parameter/source stale·forgery·clone receiver·conditional closure와 planner 41/41,
`contracts.log`는 source imports/coverage policy/package boundaries 17/17 통과다.

두 private owner의 focused source coverage는 line/branch/function 모두100%이고 16/16 tests다.
Kind registry 추가 회귀8/8도 통과했다. 같은 staging 및 npm10.9.8로 Node20.20.2/22.23.1/24.22.1을
측정해 entries757, unpacked5,167,303, packed최대1,119,757bytes를 확인했다. TarSHA256은
`54d1809683dbc6539591d97f8bc56a24c8adadb0a0544f1345720fed479c530d`로 같고 zlib에 따른
압축 차이만 존재한다. 기존755 entry 한도 실패를 보존하고757/1,120,000/5,168,000으로
최소1,000byte 단위 조정했다. 같은 minified bytes의 최대gzip은Full548,919/Basic325,553/SVG8,185다.
Full549,000/SVG25,000 한도는 유지하고 Basic만326,000으로 조정한다. Global 및 기존 critical
floor는 낮추지 않고 resourceRevision owner에95/90/100 자동 적용을 추가했다.
