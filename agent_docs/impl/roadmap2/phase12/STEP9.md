# Roadmap 2 — Phase 12 Step 9: Post-Publish Verification and Closeout

## 목표

Registry에서 다시 내려받은 `ggaction@0.0.1`을 검증하고 repeatable release system과 Roadmap 2를 종료한다.

## 진행 상태

- [x] Fresh project installs `ggaction@0.0.1` from the public registry
- [x] Main, extension, PNG and TypeScript registry-consumer checks pass
- [x] Browser default entry remains Node-native-free after registry installation
- [x] npm version, dist-tag, integrity, license, repository and homepage metadata verified
- [x] Git tag, GitHub Release and npm artifact commit identity verified
- [x] Public documentation install flow and deployed links verified
- [x] Trusted publisher and protected environment tested for future release readiness
- [x] Release runbook updated with actual first-release observations
- [x] Roadmap 2 status and Phase 12 evidence updated
- [x] Full local/remote quality gates pass after release metadata closeout
- [x] Final conceptual commits pushed and worktree clean

## Closeout audit

Closeout test는 package artifact allowlist, public entry/declaration mapping, version identity와 release workflow presence를
계속 검사한다. Registry/network verification은 release evidence로 기록하되 ordinary offline unit suite의 필수
dependency로 만들지 않는다.

## 완료 조건

`ggaction@0.0.1` is publicly installable and verified, future releases have a protected repeatable path, and Roadmap 2 has
no unfinished implementation or distribution work.

## Closeout evidence

- Registry에서 다시 받은 tarball은 candidate와 동일한 222 files, 210847 packed bytes, SHA-1, SHA-256와 SRI를
  가졌다.
- `node scripts/package-consumer.js ggaction@0.0.1`에서 main, extension, PNG, TypeScript와 private-subpath rejection이
  통과했다. 같은 registry install을 사용하는 Playwright browser test도 오류 없이 통과했다.
- npm metadata는 `0.0.1`, `latest`, MIT, `hj-n/ggaction`, `https://hyeonword.com/ggaction/`을 보고한다.
- Git tag와 GitHub Release는 approved commit `111059b2240c2198591b339f8d0cd1c12b12a1ac`을 식별한다.
- Trusted publisher binding과 protected `npm-release` reviewer/tag policy를 확인했다. 실제 OIDC publish는 이미
  존재하는 version을 재배포하지 않고 다음 version에서 처음 실행한다.
- Public install 문구가 반영된 Pages deployment와 CI run `29518733354`가 Jekyll, desktop/mobile docs, package
  matrix, coverage, browser와 PNG render를 모두 통과했다.

## Resolved packaging finding

Registry tarball inventory에서 `src/AGENTS.md`가 포함된 것을 발견했다. 이 파일에는 credential이나 비공개
source가 없고 public repository에서도 읽을 수 있지만, internal agent record를 npm artifact에서 제외한다는 release
contract를 위반했다. `0.0.1`은 immutable하므로 같은 version을 덮어쓰지 않았다. Package allowlist와 executable
forbidden-file audit를 보강하고 internal instruction file이 없는 corrective `0.0.2`를 OIDC workflow로 배포해
해결했다. 자세한 evidence는 [`STEP10.md`](STEP10.md)에 기록한다.
