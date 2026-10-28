# STEP1 — AST core 검토와 구현

## 진행 상태

- [x] 기존 computed, schema, action summary와 저장 codec 조사
- [x] 기존 의미 유지와 v2 방향의 사용자 진행 요청 기록
- [x] D2–D6 후보 계약과 남은 STEP-013 범위 구체화
- [x] baseline·독립 oracle·제안 타입·누적 suite 실행 증거 고정
- [x] 검증된 검토 패키지 commit/push 및 G-EXPR 검토 요청 준비
- [x] G-EXPR 세부 계약 승인
- [x] pure kernel 구현·독립 검증
- [ ] parameter/resolver 세부 Gate와 전체 제품 통합
- [ ] AT-16과 STEP-013 종료

[설계안](DESIGN.md), [후보](candidates.json), [Gate](G-EXPR.json), [소비자](consumers.json),
[남은 의무](obligations.json)를 함께 확인한다. 이 문서의 STEP1은 원안 STEP-013 내부의 검토 순서다.
