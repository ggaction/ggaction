# Phase 4 Step 1 — Freeze and Run the Unpaid Evaluation

## 진행 상태

- [x] Corpus, dataset catalog와 oracle schema 작성
- [x] Reproducible SHA freeze generator and checker 구현
- [x] Strict split evaluator 구현
- [x] Corpus identity checkpoint commit/push — `85fc5bde`
- [x] Development split 실행 — 18 / 18 pass
- [x] Candidate implementation commit lock — `33be9c37f84884243568061a42aaf334aca18d4d`
- [x] Validation split one-pass 실행 — strict failure, 재실행 금지
- [ ] Held-out split one-pass 실행 — validation failure로 열지 않음
- [x] Unpaid result artifact and summary 생성
- [ ] Package/install/browser cumulative checks 재실행 — full suite/package pass 뒤 strict failure에서 중단
- [ ] Paid-smoke exact proposal 작성 — unpaid pass prerequisite 미충족
- [ ] Review target commit/push
- [ ] R54-P4-A user approval

## Split discipline

1. 세 split과 oracle을 결과 확인 전에 함께 동결한다.
2. Development만 implementation correction에 사용할 수 있다.
3. Candidate commit을 잠근 뒤 validation을 한 번 실행한다. 실패하면 held-out을 열지 않고 Gate를 failure로 준비한다.
4. Validation이 통과한 동일 candidate에서 held-out을 한 번 실행한다. Held-out 결과 뒤 production code, corpus 또는
   threshold를 수정하지 않는다.
5. Generated result는 exact candidate SHA와 frozen manifest SHA를 함께 기록한다.

## 차단 범위

- Roadmap 5.3 frozen task/prompt/output read or reuse
- Phase 2 design fixture를 acceptance statistic으로 사용
- Credential read, external model call와 비용 지출
- Failed validation/held-out 결과를 본 뒤 corpus, oracle 또는 threshold 수정
- PR, merge, package publish, docs deploy와 release
