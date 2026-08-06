# STEP 2 — Build the Reproducible Integration Candidate

## 진행 상태

- [x] Clean-install and production/full audit
- [x] Normal, contract, docs and coverage suites
- [x] Generated docs build와 browser verification
- [x] Package artifact, installed consumers와 bundle budgets
- [x] Canvas/SVG/PNG/PDF and browser pixel regression
- [x] Candidate diff, commit history와 remote identity audit

## Required verification

- `npm ci`
- `npm audit --omit=dev` and full `npm audit`
- `npm test`, `npm run test:coverage`, `npm run test:docs`
- All generated `--check` contracts and `npm run docs:verify`
- `npm run package:check`, `npm run test:package`
- `npm run test:browser`, `npm run test:render`
- Full/basic/SVG installed gzip budgets: 225,000/120,000/25,000 bytes
- `git diff --check`, clean working tree and matching local/remote candidate hash

기존 approved pixels, public package surface, state와 trace가 달라지면 R52-P5-A를 열지 않는다.

## 검증 결과

- `npm ci`: lockfile에서 26 packages audit, vulnerabilities 0. `npm audit --omit=dev`와 full audit도 각각 0.
- 첫 cumulative run이 활성 Phase navigation drift 한 곳을 발견했고 `agent_docs/README.md`와
  `agent_docs/impl/README.md`를 Phase 5 owner로 동기화했다. Focused navigation contract 7/7 pass.
- Final `npm test`: 2,061/2,061 pass.
- `npm run test:coverage`: 94.76% lines, 90.26% branches, 98.47% functions; 70 critical floors pass.
- Ruby 3.2.6 runtime에서 `npm run docs:verify`: generation, docs 45/45, Jekyll 113 pages, built-doc checks와
  Playwright browser verification pass.
- Full docs regeneration이 Phase 4 source rewiring 이후 stale했던 image manifest source hashes를 발견했다. 35개
  chart/tutorial/guide source hash를 갱신했고 second generation은 image bytes와 manifest 모두 deterministic하다.
- Package artifact: 412 entries, 386,876 packed bytes, 1,827,671 unpacked bytes.
- Installed package SHA-256: `ead0efdb8fb12c0d55fe04ad56bac69b8e0e97a034acb5c2bb8b0a70832f176d`.
- Installed Vite gzip: full 222,930, Basic 112,984, SVG 5,760 bytes; all budgets pass.
- `npm run test:browser`: 53/53 pass.
- `npm run test:render`: 136/136 pass; Canvas/SVG/PNG/PDF parity and both galleries verified.
- Latest `origin/main`에서 candidate는 behind 0, ahead 22 commits이며 `git diff --check` passes across 86 changed
  files. Working tree is clean.
