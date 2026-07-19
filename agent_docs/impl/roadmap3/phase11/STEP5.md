# STEP 5 — F-008 Documentation Route and Fragment Integrity

## 진행 상태

- [ ] Published `llms.txt` route와 stale fragment 재현
- [ ] HTML과 LLM index가 공유하는 canonical route/slug owner 확정
- [ ] 모든 targeted route를 deployed artifact로 제공
- [ ] Built HTTP status와 fragment DOM 전수 회귀 추가
- [ ] Clean built-site desktop/mobile 검증

짧은 `llms.txt`는 selective retrieval index로 유지한다. 모든 target은 실제 배포 artifact에서 200을 반환하고,
fragment가 있으면 HTML DOM의 실제 heading ID와 일치해야 한다.
