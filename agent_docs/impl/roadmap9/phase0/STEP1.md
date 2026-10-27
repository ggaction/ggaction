# STEP1 — 기준 커밋과 실행 경로

## 진행 상태

- [x] 계약과 기존 소유자 확인
- [x] 구현 및 focused 검증
- [ ] 누적 검증 및 실제 증거 저장
- [ ] 커밋·push와 인계 기록

상태: implemented. 원안 STEP-001에 대응한다. Phase 누적 검증과 증거 인계는 STEP3에서 종료한다.

## 구현

- `scripts/verification-baseline.js`: 지정 커밋의 package/lock/action/command와 source-map 비교를 기록한다. 현재 작업 파일을 과거 커밋의 내용으로 오인하지 않는다.
- [baseline.json](baseline.json): 출발점 `48cbd44c7b2b3fcc81127e419bfa0936afb1063d`, 0.0.26, action 298개, export 11개, mapped source 92개 일치. 환경은 캡처 시점 관측이며 실행 성공 주장이 아니다.
- dirty checkout, 파일 이동·삭제, 중복 및 잘못된 입력, lock 불일치를 독립 임시 Git 저장소로 검사한다.
- `test/contracts/verification-baseline.test.js`, `test-discovery.test.js`, `agent-docs-navigation.test.js`를 canonical runner로 실행했다. 상세 실행 증거는 Phase 완료 기록에 모은다.

## 적용 경계

공개 action·타입·저장 형식·renderer 변경 없음. 관련 current contract 및 generated docs 변경은 불필요하다. 기존 source-map 기준은 보존하고 drift를 기록한다. 기존 동작의 누적 regression은 Phase 종료 검사로 확인한다.
