# Gate R53-P6-B — A/B/C Result and Integration Candidate

## Gate state

`approved`

Approved by the user on 2026-08-07. Gate package checkpoint: `397d5bd2`

Evaluation checkpoints:

- `6cc38d2c` — approved price/cap and bounded B/C runner
- `a2ae9c72` — executed-MCP-call metric correction
- Gate package record: this document's commit on the same remote branch
- Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 승인 대상

- Complete A/B/C raw hashes and sanitized aggregate/task evidence
- Frozen correctness and efficiency threshold decision: failed
- Failure distribution and bounded-loop explanation
- Explicit non-integration recommendation and public benefit-claim boundary
- Focused, cumulative, package and browser-isolation verification

## 평가 결과

| 항목 | A | B | C |
| --- | ---: | ---: | ---: |
| Runs | 48 | 48 | 48 |
| Final correctness | 35.42% | 0% | 0% |
| Held-out final correctness | 20.83% | 0% | 0% |
| Total model calls | 144 | 144 | 144 |
| Total MCP calls | 0 | 0 | 380 |
| Recorded cost | $1.694203 | $0.795406 | $0.729342 |

B/C는 모두 48 invalid-program이었고 program submission이 없었다. Combined paid spend는 $1.524748 / approved $10,
resolved model은 모두 `gpt-5.6-terra`, provider error는 0이다. Successful candidate chart가 없어 efficiency threshold는
세 항목 모두 unavailable/failed다.

Exact evidence와 raw hashes는 [`LLM_COMPARISON.md`](./LLM_COMPARISON.md)와
[`LLM_COMPARISON.json`](./LLM_COMPARISON.json)이 소유한다.

## Integration recommendation

현재 candidate를 PR/merge 대상으로 승인하지 않는다. Action metadata, recipes, deterministic search와 local MCP의
mechanical completeness는 입증됐지만, frozen three-model-call envelope 안에서 실제 chart submission으로 이어지지
않았다. LLM-friendly correctness/efficiency benefit claim도 쓰지 않는다.

추천하는 다음 단계는 threshold, corpus, model과 호출 상한을 바꾸는 것이 아니라 knowledge delivery가 더 적은 model
turn 안에 executable program으로 이어지도록 corrective candidate를 별도로 설계하는 것이다. Corrective candidate의
mock/dry evidence를 먼저 검토하고, 실제 B/C 재실행에는 새 model/repetition/cost Gate가 필요하다.

## 검증 증거

- Comparison generator repeated SHA-256: JSON `b524199ef763b4de154bccbd616fc059a1137c341ebfe49d334c283f7b529a05`,
  Markdown `559402cdfd13d00296fb3e208f427da118ef343cb41ba31a20f6d9279b3b441b`
- Raw B/C SHA-256: `1d51853f4a9bb46bbe2e3bdd7f98657dbd373253ed31d557b839ce98e1a3ea9e` /
  `4d15a158233a39d6d2c8a291d3e00d3c3828c0231aa166cedaa8efe3f9757a02`
- `npm test`: 2,103/2,103 passed
- `npm run test:coverage`: 94.77% lines, 90.34% branches, 98.53% functions; 70 critical floors passed
- `npm run package:check`, `npm run package:mcp-check`, `npm run test:package`, `npm run package:bundle`: passed
- Installed artifact: 417 entries, 478,664 packed / 3,115,694 unpacked bytes,
  SHA-256 `058862d81153db53e27cb49152ed7aea7a039412d584beac384cdf9666a077dd`, executable `0755`
- Browser gzip: root 222,930 / basic 112,984 / SVG 5,760 bytes; forbidden modules 0
- API key, raw provider response와 generated source가 sanitized evidence에 포함되지 않음을 확인
- `git diff --check`: passed

## Review effect

이 failed-evidence와 non-integration 결론의 승인으로 corrective failure analysis 준비가 해제되었다. PR Ready/merge는
해제되지 않았으며 external paid rerun은 새 비용 Gate 전까지 계속 차단한다.

승인 뒤 root-cause evidence는 [`FAILURE_ANALYSIS.md`](./FAILURE_ANALYSIS.md)에 기록했다.

## 승인 전 차단 범위

- PR preparation and Ready transition
- Merge and exact-main verification
- Additional external paid model runs
- Package publish, docs deployment and release
