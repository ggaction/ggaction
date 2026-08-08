# Gate R54-P4-A — Fresh Corpus, Unpaid Result, and Paid-Smoke Proposal

## Gate state

`failed`

이 Gate는 fresh split identity, strict oracle, one-pass validation/held-out unpaid result와 exact paid-smoke proposal을
승인받는다. 승인 전에는 credential을 읽거나 외부 모델을 호출하지 않는다.

## 결론

동결한 candidate `33be9c37f84884243568061a42aaf334aca18d4d`는 development 18 / 18을 통과했지만 one-pass
validation에서 exact plan order 1건이 달라 strict acceptance에 실패했다. Split discipline에 따라 validation을 다시
실행하지 않았고 held-out 15개를 열지 않았다. 따라서 이 Gate는 승인 대상이 아니며 paid smoke도 제안하거나 실행하지
않는다.

실패한 요청은 `size encoding, shape encoding, opacity encoding` 순으로 작성되었다. Resolver는 세 provider가 같은
priority일 때 provider ID를 tie-breaker로 사용하여 `encodeOpacity`, `encodeShape`, `encodeSize` 순으로 반환했다. 모든
constraint와 required option은 존재했지만 predeclared oracle은 action order까지 exact match를 요구한다.

## Fresh corpus identity

| Evidence | Result |
| --- | --- |
| Tasks | 48: development 18 / validation 15 / held-out 15 |
| Strata | simple 23 / complex 25 |
| Datasets | 3 |
| Constraint coverage | 79 / 79 |
| Phase 2 exact query overlap | 0 |
| Roadmap 5.3 corpus | not read, not reused |
| Frozen manifest SHA-256 | `7f15c5a00fb6e9d66a3a344fb88cffccafd76fac824ec12084310d51c5bb42f8` |
| Query-set SHA-256 | `b15af4ed4772dd5b359530be83045dbe9e9ccd3264124d60616d373f586ac4c4` |

## Unpaid result

| Metric | Development | Validation | Requirement |
| --- | ---: | ---: | ---: |
| Tasks | 18 | 15 | fixed split |
| Exact constraints | 18 | 15 | 100% |
| Exact plans | 18 | 14 | 100% |
| Exact unresolved | 18 | 15 | 100% |
| Exact fallbacks | 18 | 15 | 100% |
| Silent partials | 0 | 0 | 0 |
| Resolved fallbacks | 0 | 0 | 0 |
| TypeScript errors | 0 | 0 | 0 |
| Maximum packet | 2,177 B | 2,984 B | ≤ 6,144 B |
| Median packet | 1,342 B | 1,717 B | ≤ 4,096 B |
| Result | pass | **fail** | pass |

- Development result SHA-256: `034100c3917913b9a602b21afcf056d419aaa6da73289f5e6a8f86fa1be3c236`
- Candidate-lock artifact SHA-256: `234edcc7a82b60e4efd85742bbed6c690f5444af9c3c45ce2207b9771423cb54`
- Validation result SHA-256: `4cddfece92042b5aff4e0b7899664793f54135b795ecf17bdcd7c562e101fe47`
- Held-out: unopened

## Regression evidence

- `npm test` — 2,077 / 2,077 pass
- `node scripts/package-artifact.js --check` — 419 entries / 421,292 B packed / 2,160,164 B unpacked, all ceilings pass
- Focused resolver/evaluation contracts — pass
- Credential reads / external model calls / spend — 0 / 0 / $0
- Installed/browser cumulative result는 strict validation failure 뒤 Gate 승격을 중단했으므로 새 acceptance evidence로
  기록하지 않는다. Candidate가 browser entry source나 import graph를 변경하지는 않았다.

## 다음 시도에서 필요한 수정

보이는 failure를 같은 validation에 맞춰 조정한 뒤 재실행하면 leakage가 된다. 새 시도는 현재 failure를 development
evidence로 취급하고, 동등 priority provider가 요청에 등장한 순서를 보존하도록 resolver를 수정한 뒤, 아직 보지 않은
새 validation/held-out split을 별도 identity와 SHA로 동결해야 한다. 이 작업은 새로운 계획과 사용자 승인을 받아야 한다.

## 원래 승인 조건 — 미충족

1. Development 18 / validation 15 / held-out 15의 fresh task identity
2. Dataset/task/oracle SHA-256 freeze와 historical/design corpus overlap 0
3. Constraint closure, exact action/option, fallback, payload와 TypeScript strict oracle
4. Candidate lock 뒤 one-pass validation과 held-out result
5. Package, installed MCP와 browser budget regression evidence
6. Exact paid-smoke model/settings/tasks/repetitions/estimated cost/hard cap

## 현재 상태의 효과

이 failed Gate는 어떤 후속 범위도 열지 않는다. 특히 paid smoke, full paid evaluation,
PR/merge/publish/deploy/release를 승인하지 않는다.

## 승인 전 차단 범위

- Credential read, external model call와 비용 지출
- Full paid evaluation
- PR, merge, package publish, docs deploy와 release
