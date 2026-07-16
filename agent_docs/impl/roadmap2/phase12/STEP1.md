# Roadmap 2 — Phase 12 Step 1: Release Baseline and Gate A

## 목표

현재 repository, npm package, documentation deployment와 CI 상태를 release 관점에서 감사하고, public/legal/security
결정을 Gate A에서 확정한다.

## 진행 상태

- [x] First release version `0.0.1` confirmed
- [x] Current package metadata, registry name, npm authentication and repository visibility audited
- [x] Current tarball contents, size and dependency footprint recorded
- [x] Existing CI, Pages, tag, release and publish automation audited
- [x] License options and recommended choice presented
- [ ] First-publish and later trusted-publishing bootstrap sequence fixed
- [ ] Release environment approval and tag-protection policy fixed
- [ ] Gate A evidence shown to the user
- [ ] Explicit Gate A approval before STEP2

## Gate A 결정표

| Decision | Current state | Required result |
| --- | --- | --- |
| Version | confirmed | `0.0.1` |
| Package | registry lookup required at execution | unscoped public `ggaction` |
| License | absent | user-approved license and exact copyright holder |
| Repository visibility | private | explicit keep-private or make-public decision |
| npm identity | local session unauthenticated | verified owner account with publish authority |
| First publish | not configured | authenticated bootstrap procedure |
| Later publish | absent | GitHub OIDC trusted publisher |
| Release approval | absent | protected GitHub environment and explicit approval rule |

## 현재 감사 결과

- Package version과 lockfile root version은 `0.0.0`이고 README는 `0.0.0-dev` unpublished 상태다.
- Registry lookup에서 `ggaction` package는 존재하지 않았지만 실제 publish 직전 다시 확인해야 한다.
- Local npm session은 인증되지 않았고 package owner도 아직 확인되지 않았다.
- GitHub repository는 private이고 Pages site는 public legacy deployment로 정상 build된다.
- CI는 test, render, coverage와 documentation build/browser checks를 실행하지만 release/publish job은 없다.
- Git tag와 GitHub Release는 아직 없다.
- `LICENSE`와 package license/repository/homepage/bugs metadata가 없다.
- Current dry-run tarball은 920 files, 약 2.15 MB packed/6.71 MB unpacked이며 test, internal docs와 workflow를
  포함한다.
- Production dependency는 Node PNG entry가 사용하는 `@napi-rs/canvas`이며 production audit vulnerability는 0이다.

## 권장 결정

- License: broad reuse를 허용하는 MIT를 기본 권장한다. Explicit patent grant가 필요하면 Apache-2.0을 선택한다.
- Repository: public npm source와 provenance를 일치시키기 위해 public 전환을 권장한다.
- First publish: exact candidate를 npm account 2FA로 review 가능한 bootstrap 절차를 사용한다.
- Later publish: `npm-release` protected GitHub environment와 GitHub-hosted OIDC trusted publisher를 사용한다.
- Approval: version tag를 만들기 전 user approval, publish job 진입 전 protected-environment approval을 모두 요구한다.

## 완료 조건

No legal, visibility, ownership or irreversible registry decision remains implicit, and the user explicitly approves the
release contract before package metadata or external settings are changed.
