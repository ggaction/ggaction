# STEP 8 — Refactor Integration and Gate B

## 진행 상태

- [x] Source dependency cycle/direction/dead-module contract 통과
- [x] Public/internal action inventory와 trace equivalence 통과
- [x] Normal/coverage/package/Node matrix 통과
- [x] Browser 29개와 PNG 113개 통과
- [x] Architecture baseline을 실제 변경에 맞게 갱신
- [x] Gate B 결과 패키지 승인

Gate B는 source refactor의 최종 동작 불변성과 future development readability를 함께 검토한다.

## 결과

- Source JavaScript는 312개, 36,926 lines로 재편되었고 file/directory name collision은 0개다.
- Source boundary, import-cycle, dead-module, action registration, materialization policy와 package
  export contract 37개가 통과했다. Import cycle은 0개다.
- Normal suite 1,544개가 통과했다.
- Coverage는 lines 94.90%, branches 90.23%, functions 98.54%이며 critical floor 55개가 통과했다.
- Packed artifact는 320 entries, 279,786 packed bytes, 1,297,787 unpacked bytes이다.
- Node 20/22/24에서 같은 tarball SHA-256
  `bd0f28dd31676f2ca0791abcb0ae1adfb19b69742b5f1c4fc29b4a8aee82014f`를 사용해
  package structure와 installed JavaScript, extension, PNG, TypeScript, tutorial consumer를 검증했다.
- Browser suite 29개와 PNG suite 113개가 통과했고 Roadmap 2/3 gallery를 다시 검증했다.
- Public API, TypeScript declaration, semantic/graphic schema, trace operation, renderer output과 public docs는
  변경하지 않았다.

## 추가 관찰

CI 계약보다 강하게 Node 24에서 normal suite 전체도 실행했다. Grouped-bar의
independent primitive oracle가 public materializer와 `1e-13` 이하의 IEEE-754 마지막 자릿수
차이를 만들어 exact object equality 1개가 실패했다. 해당 계산 source와 test는 이번
refactor에서 import entry 경로 외에 변경되지 않았고, Node 20/22 normal suite와 Node
20/22/24 installed-package matrix, browser 및 pixel output은 모두 통과했다. Concrete number
precision contract을 변경하는 대신 이 항목을 별도 numeric-determinism 결정으로 남긴다.
