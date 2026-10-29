# 단일 Y 정책

## 진행 상태

- [x] 기존 승인 [AUTHORIZATION](../AUTHORIZATION.json)의 STEP-050 범위를 재사용
- [x] 독립 순수 검증과 기존 상태의 frame 수집기 구현
- [x] literal 경계·facet/concat·원본 불변 시험12개와 두 owner coverage 검증
- [ ] create/edit/schema/composition/load의 다섯 공개 진입 경계 연결
- [ ] 기존 conditional Y·named Y·조합 consumer와 공개 문서 동기화
- [ ] STEP-035 responsive/composition 이후 최종 통합

`grammar/framePolicy.js`가 scope-qualified coordinate와 scale identity, 실제 plot region,
y/y2 bindings와 guide visibility를 받아 하나의 Y scale·최대 하나의 보이는 Y guide를 검사한다.
별도 coordinate에 독립 scale을 넣고 같은 영역에 겹치는 우회도 거부한다.
숨긴 guide도 scale identity 검사에서 빠지지 않으며 y2의 같은 scale endpoint는 허용한다.

`materialization/frameState.js`는 기존 semantic layer·guide, coordinate bounds, namespaced child
Canvas를 읽어 이 순수 검증으로 전달한다. Facet 부모의 보관 template은 실제 child frame과
중복 집계하지 않는다. Semantic-only 호출에서는 child-local 범위끼리 섞지 않고, concrete
호출에서는 실제 parent offset을 합산해 nested concat의 겹침을 검사한다. Canvas가 아직 없는
unit은 scale identity부터 검증한다. Polar/Parallel/Geo와 Y binding 없는 annotation은 제외한다.
새 persisted state·public action·자동 materialization은 없다. guide visibility의 단일 판정 함수를
기존 paint owner와 공유하며 기존 visibility 동작은 유지한다.

현재 체크포인트는 내부 foundation이다. 다섯 공개 진입점은 아직 연결하지 않았으므로
현재 사용자 API의 새 제약으로 문서화하거나 STEP-050 완료로 주장하지 않는다.
후속 공개 preflight는 최종 후보를 검사하고, action 결과와 editable import도 같은 owner로
검증한다. 중간 primitive 작성 순서가 합법적인 최종 재바인딩을 막지 않도록 경계를 둔다.

검증: `node --test --experimental-test-coverage --test-coverage-include=src/grammar/framePolicy.js --test-coverage-include=src/materialization/frameState.js test/unit/grammar/frame-policy.test.js test/unit/frame-state.test.js`.
순수 owner100/100/100, 상태 adapter100/97.33/100(lines/branches/functions).
공통 architecture/visibility/package55개 통과, capability 정렬 수정 후 discovery16개 통과.
문서 provenance14개 통과. [증거](single-y-foundation-evidence/summary.json)에 최초 실패와 수정 결과를 함께 보존한다.
