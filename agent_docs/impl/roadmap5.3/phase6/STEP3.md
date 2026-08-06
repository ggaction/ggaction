# STEP 3 — Integrate and Close Out the Roadmap

## 진행 상태

- [x] Synchronize failed benchmark evidence and prevent unsupported public benefit claims
- [x] Re-run focused, cumulative, package and browser-isolation verification
- [ ] Prepare R53-P6-B remote checkpoint
- [ ] After separate authorization, prepare the PR for merge
- [ ] Verify the exact merged-main commit
- [ ] Prepare R53-Exit and stop for approval

## 범위 경계

Benchmark가 threshold를 통과하지 않으면 benefit claim을 쓰지 않는다. 실패 원인과 개선 후보를 기록하되 public API,
architecture 또는 benchmark rule을 결과에 맞춰 임의로 바꾸지 않는다. R53-P6-B 승인은 PR Ready/merge를, R53-Exit는
package publish/docs deployment/release를 자동으로 승인하지 않는다.

현재 candidate는 threshold를 통과하지 못했으므로 PR preparation과 closeout으로 진행하지 않는다. R53-P6-B에서는
failed evidence와 non-integration recommendation을 검토한다. Corrective candidate를 진행하려면 benchmark envelope와
threshold는 그대로 두고 knowledge delivery만 수정한 뒤 새로운 paid-run 비용 Gate를 열어야 한다.
