# Graph view와 private hit 통합

## 진행 상태

- [x] main b3330b70f와 private frame63af304de 통합
- [x] hit/frame/scene/graph filter66개, source/package/discovery33개 통과
- [x] canonical docs 전체 재생성
- [x] Node22/20 package 실측:871entries,5,845,729unpacked;packed1,269,937/1,272,840bytes
- [x] 실제 mark adapter a2294b96e와 Flow theme52207ed93 통합
- [ ] 공개 session 및 guide adapter 후속 통합

전체077의 완료 기록이 아니다. 두 branch의 critical coverage families를 모두 보존했다.
Public import graph가 변하지 않아 기존b333 browser 및 설치 증거를 재사용하며, 새 hit owner의
Node3×47/coverage/실제Canvas pixels 증거는 STEP049가 소유한다. 결합 package cap은
871/1,273,000/5,846,000으로 측정값의 최소 단위에 맞췄다.

## 실제 마크와 테마 통합

Graph view→actual hit→frame replacement→theme→editable codec를 함께 검사했다. 숨긴 노드는
index에서 빠지고 남은 node key/resource revision은 유지되며 removeFilter 뒤 같은 key가 돌아온다.
Nested composition의 다른 child는 변하지 않는다. 새 독립 회귀2개와 theme74/hit·scene·boundary72,
최종 boundary33, docs177개가 통과했다. 실행기는 새 capability 항목의 누락된 type을 거부했고
정확한 file type 추가 후 통과했다. Artifact의 상대경로 호출 실패도 절대경로로 수정해 별도 보존했다.

최종 고정 archive와 Node20 source-free runtime/TS/MCP/tutorial/Full·Basic·SVG7검사 결과는
[integration-evidence/summary.json](integration-evidence/summary.json)에 둔다.
Node20 measured Full637,955/Basic362,086gzip에638,000/363,000cap을 사용한다.
전체 suite/coverage는 이 통합에서 다시 돌리지 않았고, 각 owner의3Node/floor 증거와 영향검사를 사용했다.
UI assets/layout은 b333과 같아 기존 built-browser 결과를 재사용한다. Public pointer/session 완료는 아니다.
