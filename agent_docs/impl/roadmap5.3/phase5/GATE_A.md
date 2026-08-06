# Gate R53-P5-A — Installed Local MCP and Browser Isolation

## Gate state

`ready-for-review`

Implementation checkpoints:

- `d5bca383` — local MCP server and package boundary
- `89aaa4ec` — installed tarball and stdio verification
- `0c6ec0c5` — Condition C local evaluation adapter
- `96841eea` — browser import and bundle isolation
- `5b212572` — concise public local MCP usage
- Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 승인 대상

1. Existing `ggaction` package의 `ggaction-mcp` local stdio executable
2. Canonical action/recipe/docs resources와 bounded deterministic search tool
3. Official stable MCP SDK dependency와 package file/bin boundary
4. Installed tarball, clean consumer와 real stdio protocol evidence
5. Invalid-input and no-file/no-network/no-execution negative evidence
6. Root/basic/extension/svg/png/pdf import and browser bundle isolation
7. Condition C local adapter mock/dry evidence with zero paid calls

## Required evidence

- Exact SDK/dependency versions and installed package manifest
- Official client initialize/list/read/call results
- Packaged action/recipe/search counts and repeated-result identity
- Malformed/unknown input failures and bounded response evidence
- Source/import proof for fixed package-local reads and absence of HTTP, code/chart execution/render tools
- Root/basic/svg bundle measurements and forbidden dependency/import checks
- Complete checkpoint pushed to `origin/codex/roadmap5-3-llm-friendly`

## 구현 결과

Existing package에 official stable SDK 기반 local stdio executable을 추가했다. Exact package/resource/tool, installed
consumer, read-only negative cases, browser isolation과 Condition C mock/dry result는 [`MCP_REPORT.md`](./MCP_REPORT.md)가
소유한다.

핵심 결과는 다음과 같다.

- Installed artifact: 417 entries, 478,664 packed / 3,115,694 unpacked bytes
- Installed bin mode `0755`, SHA-256 `058862d81153db53e27cb49152ed7aea7a039412d584beac384cdf9666a077dd`
- Knowledge: 173 actions, 33 recipes, four docs sections
- Protocol: one overview, three resource templates, one read-only search tool
- Browser forbidden MCP modules: root/basic/svg 모두 0
- Browser gzip: 222,930 / 112,984 / 5,760 bytes, prior baseline과 동일
- A/B/C synthetic dry results: 72/72, external calls 0, spend $0.00
- Mocked C executable flow: final valid, 2 model calls, 3 MCP calls, repair 0

## 검증 증거

- `npm run knowledge:check`: passed
- `npm test` and `npm run test:coverage`: passed
- `npm run test:contracts`: 208/208 passed
- `npm run test:docs`: 45/45 passed
- `npm run package:check`, `npm run package:mcp-check`, `npm run test:package`: passed
- Installed Node/TypeScript/Canvas/SVG/PNG/PDF and root/basic/svg production bundles: passed
- `git diff --check`: passed

## 호환성과 경계

- Public chart export map, declarations, action behavior, state와 renderer output은 바뀌지 않았다.
- `ggaction-mcp`는 importable export가 아니라 existing package의 Node-only bin이다.
- Root/basic/extension/svg/png/pdf source graph가 MCP SDK, `zod`, generated knowledge와 `mcp/`를 import하지 않는다.
- Hosted transport, arbitrary file/network/code/chart execution, rendering, write tool, account/auth/database는 추가하지 않았다.
- External paid B/C evaluation, PR Ready/merge, publish/deploy/release는 승인 범위가 아니다.

## Approval effect

승인하면 Phase 6 final B/C comparison의 exact model/repetition/cost proposal인 R53-P6-A를 준비할 수 있다. 이 Gate는 external
paid model calls, PR Ready/merge, package publish, docs deployment 또는 release를 승인하지 않는다.

## Work blocked before approval

- External or paid B/C LLM runs
- Phase 6 benchmark result and closeout claims
- PR Ready/merge, package publish, docs deployment and release
