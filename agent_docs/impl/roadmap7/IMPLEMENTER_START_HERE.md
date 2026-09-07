# 구현자 인계 — 여기부터 시작

사용자는 감사 번호 25개를 골랐으며, 먼저 아주 상세한 로드맵을 요구했다. 이 문서가 있는 변경은 계획 작성이다. 제품에 25개 기능이 구현됐다고 가정하지 않는다. 새 API 이름·옵션·수식은 Proposed 권장안이다.

## 첫 작업

1. 저장소 root와 실제 수정 영역의 AGENTS.md를 읽는다. 다른 project 디렉터리는 조사하지 않는다.
2. git status/branch/log와 agent_docs/impl/ROADMAP_INDEX.json을 확인한다. 다른 사람의 수정은 보존한다.
3. ROADMAP → COMMON_CONTRACT → API_DETAILS → DECISIONS → 현재 Phase의 GOAL/STEP/GATES → 해당 feature 순서로 읽는다.
4. ACTION_INDEX에서 가장 가까운 현재 action의 contract.file/anchor와 관련 source/type/tests를 확인한다. Proposed 문구를 현재 동작의 증거로 삼지 않는다.
5. Gate의 실제 사용자 승인을 확인한다. 계획을 approved로 임의 수정하지 않는다. 이미 승인된 범위는 계속 진행한다.

## 하나의 기능을 구현하는 순서

1. **입력·출력 표를 고정한다.** 최소 호출, 명시 ID, 모든 mode/default, invalid case, expected semantic/graphic을 작성한다. field/grain/ownership이 불명확하면 feature와 API_DETAILS를 읽는다.
2. **Pure core를 구현한다.** canonical validator, requested extractor, 통계·geometry resolver를 먼저 만든다. 기존 helpers를 찾아 중복을 피한다.
3. **Domain action을 연결한다.** 기존 wrapper/primitive/rematerializer를 사용한다. 성공과 오류에서 불변성과 trace를 확인한다.
4. **Consumer lifecycle을 검증한다.** edit, reencode, Canvas/source replay, selection, labels, guides, facet/repeat, remove를 확인한다. 후속 Phase 기능은 명시적인 pending integration으로 남긴다.
5. **Public surface를 동기화한다.** Full registry, type exports, current contract, ACTION_INDEX, relations/cards, MCP, docs/examples를 함께 갱신하고 basic에 새 method가 유출되지 않았는지 확인한다.
6. **시각 증거를 만든다.** primitive source/manifest/target chain을 먼저 만들고 V Gate 범위를 확인한다. public 구현 후 같은 실행의 pixel parity를 검증한다. 육안 확인만으로 끝내지 않는다.
7. **검증 결과를 기록한다.** 기능별 oracle, scoped/cumulative tests, package consumer의 실제 결과를 STEP의 commit/artifact와 연결한다. 실행하지 않은 것은 미실행으로 적는다.
8. **Commit하고 push한다.** 검증된 coherent diff를 기록한 뒤 다음 작업으로 진행한다. PR/publish는 별도 authorization을 확인한다.

## 추측으로 채우지 않을 항목

| 잘못 구현하기 쉬운 해석 | 정확한 계약 |
| --- | --- |
| R20은 예전 제외 F20이므로 제외 | 번호 체계가 다르다. R20 Parallel focused scale은 필수 |
| Window의 day는 시간대별 달력 하루 | 정확히 24h. Calendar bucket은 R08 |
| percentChange에 100을 곱한다 | fraction 반환. index만 100 기준 |
| Size range는 radius | px² 면적. circle radius=sqrt(area/π) |
| 가중 분산 분모는 항상 W-1 | reliability는 W-W2/W |
| 결측은 자동으로 0을 채운다 | complete의 null과 explicit impute 0을 구분 |
| Source label selection은 raw row index | 현재 source의 final-item grain |
| 표시명을 바꾸면 domain key도 변경 | raw typed identity 보존 |
| 빈 facet은 임의 0..1 축 생성 | explicit/shared domain 또는 기존 empty-domain 오류 |
| Theme가 모든 색을 덮는다 | explicit style과 data palette 보존 |
| Data edit는 모든 snapshot을 항상 갱신 | 기본 descendants reject, 명시 recompute만 재계산 |
| Resource 삭제는 semantic만 검사 | configs/retained templates/parallel dims/legend refs까지 |
| PNG가 있으면 시각 검증 완료 | 현재 실행의 primitive/public parity와 승인 근거 필요 |

## 보고와 인계

무엇을 바꿨는지, 왜 그렇게 정의했는지, 어떻게 검증했는지, 남은 Gate와 지원 cell이 무엇인지 설명한다. 명령 나열로 실제 결과를 대신하지 않는다. 오류나 부족한 환경을 숨기지 않고 해결 가능한 독립 작업은 계속한다. 범위나 API의 중요한 변경은 구체적인 검토 자료로 제시한다.
