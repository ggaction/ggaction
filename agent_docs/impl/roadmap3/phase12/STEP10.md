# STEP 10 — Repository Transfer and Gate C

## 진행 상태

- [x] Gate C transfer checklist 승인
- [x] `hj-n/ggaction`을 `ggaction/ggaction`으로 transfer
- [x] Local origin과 canonical repository identity 갱신
- [ ] Actions, environment와 trusted publisher 재연결
- [x] Old repository/raw/release URL redirect 검증
- [ ] New repository full CI와 Pages release configuration 검증
- [ ] Transfer closeout

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

## Remaining Gate C work

1. npm trusted publisher의 repository binding을 `ggaction/ggaction`으로 변경하고 exact
   stored value를 다시 확인한다.
2. 이 execution record를 새 origin에 push해 organization repository에서 full CI와 Pages
   deployment를 검증한다.
3. 검증 결과를 기록하고 STEP 10을 close한다.
