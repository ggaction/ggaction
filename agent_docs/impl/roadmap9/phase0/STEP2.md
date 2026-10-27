# STEP2 — 독립 oracle와 fixture harness

## 진행 상태

- [x] 계약과 기존 소유자 확인
- [x] 구현 및 focused 검증
- [ ] 누적 검증 및 실제 증거 저장
- [ ] 커밋·push와 인계 기록

상태: implemented. 원안 STEP-002에 대응한다. Phase 누적 검증과 증거 인계는 STEP3에서 종료한다.

## 구현

- `test/oracles/native-fixtures.js`: JSON literal schema, 명시 abs/rel tolerance, 결정적 hash와 uint32 seeded input. 비유한 값·cycle·duplicate ID·깊이/노드 한도 위반을 거부한다.
- numeric, geometry, state, time, assets 소유자를 분리했다. `test/fixtures/verification.json`의 5개 literal anchor는 harness 자체의 검증용이며 미래 기능 구현의 통과 증거가 아니다.
- 틀린 구간·면적·시간·자산, 실제 public edit 실패 후 semantic/graphic/trace 보존을 검증했다.
- `test/contracts/oracle-independence.test.js`는 transitive production import가 없는지 확인한다.
- focused: `node scripts/run-tests.js all unit/oracles contracts/oracle-independence.test.js contracts/test-discovery.test.js`.

공개 action·타입·저장·renderer 변경은 없다. `test/README.md`에 실행 계약과 적용 범위를 문서화했다.
