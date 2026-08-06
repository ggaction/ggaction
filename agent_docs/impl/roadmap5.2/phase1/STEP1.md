# STEP 1 — Protect Main Without Blocking the Solo Maintainer

## 진행 상태

- [x] Existing CI job contexts 확인
- [x] Exact branch rules와 bypass policy 작성
- [x] Active repository ruleset 생성
- [x] Required checks와 pull-request boundary 검증
- [x] Force-push/delete protection 검증
- [x] Emergency bypass와 release environment 보존 확인

## Exact target

`main`을 대상으로 active repository ruleset 하나를 둔다.

- Pull request required
- Required approvals: 0
- Required status checks, strict up-to-date branch:
  - `package (20)`
  - `package (22)`
  - `package (24)`
  - `test`
  - `coverage`
  - `documentation`
- Branch deletion blocked
- Non-fast-forward/force push blocked
- Repository administrator emergency bypass allowed
- Merge 후 head branch auto-delete enabled

Required approvals 0은 review를 금지한다는 뜻이 아니다. 외부 PR은 필요할 때 review를 요청할 수 있지만, sole
maintainer가 자기 변경에 승인할 수 없어 repository 전체가 막히는 규칙은 만들지 않는다.

## Recovery boundary

- Ruleset ID와 exact API result를 Gate evidence에 기록한다.
- Emergency bypass는 ordinary direct push 절차가 아니라 settings/production recovery에만 사용한다.
- Existing `npm-release`와 `github-pages` environments, exact-tag release workflow는 바꾸지 않는다.
- Ruleset 적용이 tag-based release dispatch를 막거나 current CI context와 맞지 않으면 active 상태로 두지 않는다.

## Applied result

- Repository ruleset `20421930` (`Protect main via PR and CI`) is active for the default branch.
- The evaluated `main` rules require a pull request and strict success from all six approved CI contexts.
- Branch deletion and non-fast-forward updates are blocked.
- User `hj-n` is the sole always-bypass actor for emergency recovery; ordinary contribution still uses a pull request.
- `delete_branch_on_merge` is enabled.
- Existing `npm-release` and `github-pages` environment protection rules and deployment branch policies remain unchanged.
