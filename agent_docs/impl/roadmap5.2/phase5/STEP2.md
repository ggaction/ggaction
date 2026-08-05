# STEP 2 — Build the Reproducible Integration Candidate

## 진행 상태

- [ ] Clean-install and production/full audit
- [ ] Normal, contract, docs and coverage suites
- [ ] Generated docs build와 browser verification
- [ ] Package artifact, installed consumers와 bundle budgets
- [ ] Canvas/SVG/PNG/PDF and browser pixel regression
- [ ] Candidate diff, commit history와 remote identity audit

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
