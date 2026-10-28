# 통합 realistic 시나리오 동기화

## 진행 상태

- [x] ade3dd16 CI의 realistic shard6 실패 원인 확인
- [x] 새 pivot create/edit를 실제 lifecycle recipe와 direct trace 검증에 추가
- [x] 옵션 inventory·literal·ledger 기대값 및 구체 pivot/calendar 계약 동기화
- [x] canonical realistic focused10/10, source/discovery27/27
- [ ] 수정 revision의 전체 CI와 Phase3 종료 기록

CI40712513372는 ade3dd16에서 모든 일반 job과 realistic shard1/2/3/4/5/7은
성공했으나 shard6의2개 기대값이 기존295개 public action을 가리켜 실패했다.
297개로 수치만 바꾸지 않고 createPivotData/editPivotData를 실제 direct lifecycle recipe에
추가했다. 최종 mean/groupBy 결과와 action trace가 남는지 확인한다.

Generated option inventory는2739top-level/21911nested, 총24650paths,
required17041/excluded7609다. Pivot의17개 top-level option과 op6종,
edit dependents2종, 두 complete action의 calendar/day/timeZone 경계를 명시한다.
Ledger30672개 requirement와 새 pivot direct-trace witness도 검사한다.
기존 scale192paths/897literal, bootstrap 및 다른 semantic assertion은 유지한다.

첫 local 수정에서는 excluded-array aggregate 기대값7576이 남았고, 다음 실행에서는
ledger total30604가 남아 실패했다. 모두 원본 로그로 보존한 뒤 해당 고정 inventory를
동기화했다. 최종 두 realistic 파일10/10, source/discovery27/27 성공이다.
실제 runtime/source/types 변경은 없다. ade3dd16의 coverage와 local clean 성공 기록은
그 revision의 증거로 유지하고 새 revision에 재명명하지 않는다.

```sh
node scripts/run-tests.js realistic contracts/generated-scenario-feature-coverage.test.js contracts/generated-lifecycle-scenarios.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js
```

압축 원본 CI와 local logs, SHA256은 [realistic-repair/manifest.json](realistic-repair/manifest.json)에 있다.
새 CI가 통과하기 전 STEP013–015의 종료 기록을 확정하지 않는다.
