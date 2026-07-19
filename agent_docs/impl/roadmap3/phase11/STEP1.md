# STEP 1 — Evaluation Baseline and Reproduction Map

## 진행 상태

- [x] `DEVELOPER_AGENT_PROMPT.md`, final report와 handoff 확인
- [x] F-008~F-015 finding 원문과 연결 증거 확인
- [x] Coverage matrix, option과 interaction 영향 범위 확인
- [x] Exact `0.0.3` F-012 reproduction batch 실행
- [x] 개발 저장소 source/test/docs ownership 확인

평가 결과는 S1 한 건(F-012)과 S2 일곱 건으로 구성된다. 0.0.2 F001–F007과 113개 회귀 시나리오는
모두 통과한 상태이므로, 수정은 이 안정성을 유지하는 shared owner에 한정한다.

F-012 exact batch는 호출 자체가 26/26 성공했지만 `fontWeight: 650` Node PNG가 수백 pixel glyph를
생성하는 silent visual corruption을 재현했다. 이후 finding도 성공 exit code만 보지 않고 concrete state,
pixel geometry, HTTP route, strict compile 결과를 각각 완료 판정에 사용한다.
