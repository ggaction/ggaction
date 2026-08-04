# Gate R52-P0-A — Repository Integrity and Hardening Contract

## Gate state

`planned`

## 쉽게 보는 승인 내용

이 Gate는 새 기능을 승인하는 것이 아니다. 현재 `0.0.8`을 안전하게 유지하기 위해 다음 순서와 기준으로
정리 작업을 해도 되는지 승인하는 Gate다.

1. `main`은 PR과 CI를 통과해야 바뀌게 만들되 solo maintainer에게 별도 리뷰 승인을 요구하지 않는다.
2. Contribution/security 파일과 자동 보안 경고를 추가한다.
3. SVG와 bundle size처럼 코드와 다르게 적힌 문서를 고치고 재발 방지 test를 만든다.
4. 47개 `Partial`을 위험 기반 test와 executable delegation으로 해결한다.
5. CI의 Node deprecation warning과 compatible dependency update를 정리한다.
6. Basic browser bundle을 README 약속인 120,000-byte gzip 이하로 복원한다.

## Recommended decisions

1. Required PR: yes; required review approvals: 0; required CI checks: all six current jobs.
2. Force push/delete: blocked; maintainer emergency bypass: allowed; merged branch auto-delete: enabled.
3. Community: bug/feature/PR templates, Contributor Covenant와 Security Policy.
4. Security: Dependabot alerts/updates, secret scanning and push protection where GitHub supports them.
5. Coverage: action partial count 25 to 0, without exhaustive Cartesian-product tests.
6. Documentation: fix current facts and add mechanical renderer/export/budget drift guards.
7. Dependencies: patch/minor by default; major only with focused compatibility evidence.
8. Bundles: basic at or below 120,000 gzip; full at or below 225,000; SVG at or below 25,000.
9. Visual/public behavior: unchanged. Pixel drift or public contract change stops the Phase.
10. Release: excluded. `0.0.9` preparation needs R52-Exit and separate authorization.

## Required evidence

- Clean `0.0.8` main and exact starting commit
- Action, test, contract-partial and package baselines
- GitHub branch/ruleset/community/security settings baseline
- Production audit and dependency update baseline
- Full/basic/SVG bundle measurements and mismatched documentation evidence
- Roadmap Phase/Gate dependency, explicit non-goals and compatibility impact
- Agent-documentation navigation and contract tests
- Verified remote checkpoint on `origin/codex/roadmap5-2-hardening`

## Approval effect

Approval permits Phase 1 repository governance/community/security work under the exact recommended policy. It does not
pre-approve later Gate results, public API changes, PR creation, merge, package publish, documentation deployment or release.

## Work blocked before approval

- GitHub ruleset, repository settings or security feature changes
- Community template and public/internal truth correction
- Current contract status and test changes
- Workflow, dependency, source registrar and bundle changes
- Phase 1~5 implementation

## Remote checkpoint

- Pending verification and push.
