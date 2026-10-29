# 지리 원본과 투영 통합

## 진행 상태

- [x] 전체 승인과 incoming `6c3f022cf` source/projection 경계를 유지
- [x] 경로·영역 선택·연결 필터와 source `34e070eae`에서 통합
- [x] 집중96·계약34·브라우저24, 실제데이터37·inventory7의 유효 범위 구분
- [x] 같은 tar Node20·22·24 각각 runtime28·공개 strict TS·15투영·3개 dependency 법적/source signature 검증
- [x] 모든 설치 runtime의 5bundle 실측과 상한 검증
- [x] source pin 문서194·built171pages/1481LLM·전체320/390/768px browser
- [x] 검증한 source와 기록을 main에 반영 (`752a377bb`)
- [ ] Geo mark·coordinate와 나머지 지리 기능 및 STEP074·077 누적 인수

현재 지리 원본과15개 named projection만 이 통합의 완료 범위다. 투영은 명시 viewport와
exact geometry revision을 사용하고 geometry 수정은 모든 fitted projection 후보를 먼저
검증하여 한 번씩 저장한다. Basic은 지리 authoring/computation을 등록하지 않는다.
도형/점/선/격자선 등의 공개 지도 소비자는 다음 checkpoint이며 이 증거로 완료 처리하지 않는다.

지리 수식 dependency의 bare import로 native browser 예제가 준비되지 않던 문제는 canonical
license manifest 기반의 공통 browser loader로 연결했다.115개 예제가 같은 loader를 사용하며
누락됐던 getting-started의 `#status`도 필수 완료 신호로 보강했다. 최종 marks-free 조합에서
실제 browser24개가 통과한다. 최초 중단된19개 실패의 partial log와 종료 receipt도 보존한다.

Archive SHA256 `5091be37d1a882579ab0566b51f5fff2073d6bb01c840ce38add8b12ea774d11`은
1007entries/1436661packed/6532203unpacked이며 source pin 후 재포장도 byte-identical이다.
Node20/24 Full707624gzip과 package/search 실측에는 최소 올림 상한만 적용했다.
모든 설치에서 runtime28개와 geometry/projection 및 전체 공개 TypeScript fixture,
15개 투영의 inverse와 literal 수식/fit, 세 수식 dependency의 license와 source signature를 검증했다.

Geo action/materialization7개 owner는100/100/100이며 shared prepared context도 동일하다.
Shared resourceState의 실제 function coverage는88%이고 전체 coverage 또는 전체 corpus 통과로
확대 해석하지 않는다. 이전37개 실제데이터와133개 owner coverage, incoming grammar/selector
증거의 재사용 경계를 [증거](geo-completion-evidence/summary.json)에 명시한다.
