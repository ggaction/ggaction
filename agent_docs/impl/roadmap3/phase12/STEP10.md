# STEP 10 — Repository Transfer and Gate C

## 진행 상태

- [x] Gate C transfer checklist 승인
- [x] `hj-n/ggaction`을 `ggaction/ggaction`으로 transfer
- [x] Local origin과 canonical repository identity 갱신
- [x] Actions, environment와 trusted publisher 재연결
- [x] Old repository/raw/release URL redirect 검증
- [x] New repository full CI와 Pages release configuration 검증
- [x] Transfer closeout

Public metadata와 documentation URL 변경은 STEP 11 release preparation에서 한 번에 적용한다.

## Transfer execution record

- Pre-transfer `main`은 `5626c73dac432f893305e9ba0c28bd7073a4f01a`였고 worktree는
  clean이었다. 모든 local refs를 포함한 git bundle을
  `.artifacts/transfer/pre-transfer-5626c73.bundle`에 만들고 complete history로 검증했다.
- Pre-transfer CI run `29675332074`는 transfer 직전에 전체 성공했다.
- Repository는 `ggaction/ggaction`으로 이전됐고 repository ID `1297378742`가 유지됐다.
- Local `origin`은 `https://github.com/ggaction/ggaction.git`이며 remote `main`과
  `v0.0.1`~`v0.0.3` tag를 새 주소에서 다시 읽어 검증했다.
- Old repository, Git과 release URL은 새 organization URL로 redirect된다. Old raw URL도
  기존 package resource를 계속 `200`으로 제공한다. Redirect 보존을 위해 old
  `hj-n/ggaction` path에는 새 repository를 만들지 않는다.

## Preserved repository state

- Actions은 enabled/all-actions, default workflow permission read-only이며 `CI`, `Release`,
  legacy Pages workflow가 active 상태로 유지됐다.
- `github-pages`와 `npm-release` environment가 유지됐다. `npm-release`는 `hj-n` required
  reviewer, `prevent_self_review: false`와 기존 branch policy를 유지한다.
- Repository Actions secret과 variable은 각각 0개이고 ruleset은 없다.
- GitHub Release `v0.0.1`, `v0.0.2`, `v0.0.3`과 대응 tag가 유지됐다.
- Pages source는 `main:/docs`, build type은 legacy이고
  `https://ggaction.github.io/ggaction/`이 `200`으로 응답한다.

## Post-transfer verification

- npm trusted publisher는 `ggaction/ggaction`, workflow `release.yml`, environment
  `npm-release`, permission `npm publish`로 변경됐다. npm success notification과 저장 후
  표시된 exact value를 모두 확인했다.
- Transfer record commit `837bcad`를 new origin에 push했다.
- Organization repository CI run `29675569716`이 coverage, documentation, Node 20/22/24
  package consumer와 browser/PNG test를 포함해 전체 성공했다.
- Pages run `29675568649`이 성공했고 `https://ggaction.github.io/ggaction/`이 `200`으로
  응답한다.
- Package sidebar가 보여 주는 repository/homepage는 published `0.0.3` metadata이므로 아직
  old value인 것이 정상이다. Source package metadata와 public documentation URL은 STEP 11의
  `0.0.4` release preparation에서 함께 갱신한다.
