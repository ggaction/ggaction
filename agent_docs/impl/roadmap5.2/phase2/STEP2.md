# STEP 2 — Turn Manual Facts Into Failing Contracts

## Mechanical owners

- Public export key의 canonical owner: `package.json#exports`
- Browser bundle ceiling의 canonical numeric owner: `scripts/browser-bundle-size.js`
- Current renderer boundary의 canonical architecture owner: `agent_docs/SECOND_ARCHITECTURE.md`
- Published version alignment owner: existing documentation/package contract tests

Stable `documentation-truth` contract는 package export set을 README와 architecture entry set에 대조하고,
full/basic/SVG documentation ceiling을 executable constant와 대조한다. Current renderer heading이 존재하면서 SVG가
current limitation으로 되돌아가지 않는지도 검증한다.

Version alignment는 기존 `test/docs/documentation.test.js`가 package version, docs config와 README status를 이미
비교하므로 같은 rule을 새 test에 복제하지 않고 cumulative docs verification으로 확인한다.
