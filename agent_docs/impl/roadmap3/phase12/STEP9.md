# STEP 9 — Organization and Transfer Preflight

## 진행 상태

- [x] 사용자가 GitHub `ggaction` organization 생성
- [x] Target `ggaction/ggaction`과 관리자 권한 확인
- [x] Actions, environments, ruleset, Pages와 release 권한 inventory
- [x] npm trusted publisher의 current repository binding 확인
- [x] Transfer 후 canonical Pages URL 결정
- [x] Transfer/rollback/redirect checklist와 Gate C 승인

Organization이 생성되기 전에는 transfer mutation을 시도하지 않는다.

## Preflight snapshot

### Target organization

- `ggaction` organization ID는 `306683337`이고 GitHub Free public organization이다.
- `hj-n`은 active direct member이자 organization admin이며 public repository를 만들 수 있다.
- `ggaction/ggaction`은 존재하지 않아 target name이 비어 있다.
- Organization default repository permission은 `read`이며 현재 member는 `hj-n` 한 명이다.
- Current GitHub CLI token은 `admin:org` scope를 가지지 않아 organization-wide Actions override를
  REST API로 읽지 않았다. 새 권한을 요청하는 대신 repository setting snapshot을 기록하고,
  transfer 후 new repository의 실제 full CI 실행을 최종 검증으로 사용한다.

### Source repository

- Repository ID `1297378742`, canonical name `hj-n/ggaction`, visibility `public`, default branch `main`이다.
- `hj-n`은 source repository admin이다.
- Actions은 enabled/all-actions, default workflow permission은 read-only이다.
- Active workflow는 `ci.yml`, `release.yml`, legacy Pages deployment 세 개다.
- Repository Actions secret과 variable은 각각 0개이다.
- Environment는 `github-pages`와 `npm-release` 두 개다. `npm-release`는 `hj-n`
  required reviewer, `prevent_self_review: false`와 branch policy를 소유한다.
- Branch protection과 repository ruleset은 없다.
- Release/tag `v0.0.1`, `v0.0.2`, `v0.0.3`이 존재한다.
- Pages는 `main:/docs` legacy source에서 built 상태이며 현재 표시 URL은
  `http://hyeonword.com/ggaction/`이다. Repository-level `CNAME`은 없고 HTTPS enforcement도
  꺼져 있다.

### npm release identity

- Package `ggaction@0.0.3`의 trusted publisher는 `hj-n/ggaction`, workflow `release.yml`,
  environment `npm-release`, permission `npm publish`이다.
- Publishing access는 2FA required/token disallowed이고 npm maintainer는 `hyeonjeon` 한 명이다.
- Transfer 후 publisher owner를 `ggaction/ggaction`으로 즉시 변경해야 한다. npm은
  trusted publisher를 패키지당 하나만 허용하며 저장 시 repository 실존을 검증하지
  않으므로 transfer 후 exact value를 다시 읽어 검증한다.

## Pages decision

GitHub은 repository Git/HTML URL을 자동 redirect하지만 repository에 연결된 Pages URL은
redirect하지 않는다. 현재 repository에는 own custom domain이 없으므로
`hyeonword.com/ggaction/`이 transfer 후에도 유지된다고 가정하지 않는다.

결정 후보는 다음과 같다.

1. **`https://ggaction.github.io/ggaction/` 사용 (recommended).** Organization identity와 일치하고
   DNS/credential coupling이 없다. Package homepage, README, docs link는 STEP 11의 release-only
   documentation update에서 한 번에 변경한다.
2. **`https://ggaction.hyeonword.com/` custom subdomain 사용.** 별도 DNS record와
   organization domain verification이 필요하다.
3. **`https://hyeonword.com/ggaction/` 유지.** Organization repository와 personal Pages
   deployment target을 분리하는 cross-repository deployment/credential 구조가 필요하다. 이 구조는
   release process에 불필요한 결합을 추가하므로 권장하지 않는다.

결정: `https://ggaction.github.io/ggaction/`를 canonical Pages URL로 사용한다. Repository
이름은 package identity와 같은 `ggaction`으로 유지하고 organization-site repository인
`ggaction.github.io`로 rename하지 않는다.

## Gate C execution checklist

Gate C 승인 후에만 다음 순서를 실행한다.

1. Clean worktree, exact `main` SHA, all refs와 repository setting snapshot을 기록하고
   git bundle backup을 gitignored artifact로 만든다.
2. `hj-n/ggaction`을 name 변경 없이 `ggaction` organization으로 transfer한다.
3. Repository ID가 같고 canonical full name이 `ggaction/ggaction`이며 old repository/Git URL이
   redirect되는지 확인한다. Old `hj-n/ggaction` path에 새 repository를 만들지 않는다.
4. Local `origin`을 `https://github.com/ggaction/ggaction.git`로 변경한다.
5. Actions, environments, `npm-release` reviewer/branch policy, releases/tags와 Pages source를
   다시 inventory한다.
6. npm trusted publisher를 `ggaction/ggaction` + `release.yml` + `npm-release` + `npm publish`로
   변경하고 저장된 exact value를 다시 읽는다.
7. New canonical identity를 사용하는 internal/package metadata commit을 push해 full CI와
   선택한 Pages endpoint를 검증한다. Public docs 본문은 STEP 11 전에 변경하지 않는다.

## Rollback

- Post-transfer verification이 실패하면 old path에 새 repository를 만들지 않은 상태에서
  repository를 `hj-n`으로 다시 transfer한다.
- Local origin과 npm trusted publisher를 `hj-n/ggaction`으로 되돌리고 source settings snapshot과
  git bundle로 identity/ref/state를 검증한다.
- Pages는 redirect되지 않으므로 선택한 endpoint의 build가 통과하기 전에 old DNS나
  domain binding을 제거하지 않는다.

## Authoritative references

- [GitHub repository transfer](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
