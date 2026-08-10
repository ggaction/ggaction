# Gate R52-P2-A — Current Documentation Truth and Mechanical Guards

## Gate state

`approved`

사용자가 2026-08-05에 corrected README/architecture truth, package export·renderer·bundle drift guards와 Phase 4에
남겨 둔 Basic 120,000-byte 복원 경계를 명시적으로 승인했다.

## Review target

1. README와 current architecture가 SVG/PNG/PDF/Canvas renderer support를 현재 구현과 같게 설명한다.
2. README가 Basic Browser의 current executable 128,000-byte gzip ceiling을 정확히 설명한다.
3. Architecture가 full/basic/SVG executable ceiling을 한 표로 기록한다.
4. Package export, renderer limitation과 bundle ceiling drift가 stable contract를 실패시킨다.
5. Existing package version, docs config와 README version alignment가 계속 통과한다.
6. Runtime, declarations, output pixels, package boundary와 bundle implementation은 바뀌지 않는다.

## Required evidence

- Exact README and `SECOND_ARCHITECTURE.md` corrections
- Focused documentation-truth contract
- Existing documentation version-alignment test
- Cumulative contract and documentation suites
- Verified remote checkpoint on `origin/codex/roadmap5-2-hardening`

## Evidence

### Corrected truth

- README Basic Browser text now states the current executable 128,000-byte gzip regression ceiling instead of 120,000.
- `SECOND_ARCHITECTURE.md` no longer lists the implemented SVG renderer as a current limitation.
- The current source tree and limitation prose now describe Canvas/SVG/PNG/PDF ownership consistently.
- Architecture records executable full/basic/SVG ceilings as 225,000/128,000/25,000 gzip bytes.

### Mechanical guards

- `package.json#exports` is compared with the README package table and architecture package-entry headings.
- `scripts/browser-bundle-size.js` remains the canonical numeric owner and is compared with the architecture budget table and
  README Basic Browser statement.
- Current renderer headings and the absence of stale SVG limitation prose are stable contract assertions.
- Existing documentation tests continue to compare package version, docs config version and README release status.

### Verification

- `node --test test/contracts/documentation-truth.test.js` — 3/3 pass
- `node --test test/docs/documentation.test.js` — 27/27 pass
- `npm run test:contracts` — 166/166 pass
- `npm run test:docs` — 45/45 pass
- `npm run test:package` — installed runtime, types, exports and consumer checks pass
- Installed gzip measurements: full 222,166; basic 126,454; SVG 5,760 bytes
- `git diff --check` — pass

## Approval effect

Approval freezes the corrected current facts and drift guards and opens Phase 3 partial-coverage completion. It does not
authorize CI/dependency/bundle implementation, PR creation, merge, publish, deploy or release.

## Approval

- Approved explicitly by the user on 2026-08-05.
- Approval freezes the Phase 2 corrected facts and mechanical guards and opens Phase 3 partial-coverage completion.

## Work blocked before approval

- Current contract partial status and action test changes
- CI action runtime and dependency changes
- Browser bundle source optimization or budget reduction
- Phase 3~5 implementation

## Remote checkpoint

- Verified implementation checkpoint: `b101b5d6f783f86b186fd1b04a8bc48ddbc7fb75`
- Remote branch: `origin/codex/roadmap5-2-hardening`
