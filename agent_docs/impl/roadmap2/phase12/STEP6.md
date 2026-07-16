# Roadmap 2 — Phase 12 Step 6: Secure Repeatable Publishing Automation

## 목표

GitHub tag와 protected release environment에서 exact commit을 검증하고 npm에 배포하는 reusable workflow를 만든다.

## 진행 상태

- [x] Dedicated release workflow added with least-privilege permissions
- [x] Tag and package-version equality enforced
- [x] Clean checkout, `npm ci`, full quality gates and package-consumer checks enforced
- [x] Release artifact is packed once and the reviewed artifact identity is retained
- [x] GitHub-hosted OIDC permission configured without a committed npm token
- [x] npm trusted publisher procedure documented; live binding assigned to STEP8 after bootstrap package creation
- [x] Protected GitHub release environment and approval policy configured
- [x] Tag/release protection and concurrent duplicate-publish prevention configured
- [x] GitHub Release creation and npm publish failure boundaries defined
- [x] Workflow syntax and safe non-publishing path verified
- [x] STEP status, conceptual commit and push

## Bootstrap policy

Trusted publisher는 npm package가 존재한 뒤 package settings에 exact GitHub owner/repository/workflow filename과
environment를 등록한다. First publish에 별도 authenticated bootstrap이 필요하면 Gate A에서 승인한 최소 절차만
사용하고, `0.0.1` 직후 trusted publisher를 연결해 subsequent release에서 long-lived automation token을 제거한다.

Release workflow는 `id-token: write`와 필요한 최소 `contents` permission만 사용한다. Publish job은 GitHub-hosted
runner에서 실행하고 cache에 의존하지 않으며 protected environment approval을 통과해야 한다.

## 완료 조건

Future releases can be made from a reviewed version/tag through one protected OIDC workflow, with no reusable npm secret
stored in the repository.

## 구성 결과

- GitHub가 `release.yml`을 workflow ID `314581687`로 인식했으며 push event가 없어 현재 실행 횟수는 0이다.
- `npm-release` environment는 reviewer `hj-n`, `prevent_self_review: false`, custom deployment tag policy `v*`를
  사용한다. Maintainer가 tag ref에서 workflow를 dispatch한 뒤 같은 maintainer가 environment deployment를
  명시적으로 승인해야 publish job이 시작된다.
- Workflow는 Node 24와 npm `^11.5.1`, GitHub-hosted runner, `id-token: write`를 사용한다. npm token secret은
  참조하지 않는다.
- `0.0.1`은 Gate A에서 승인한 interactive bootstrap 경로를 사용하므로 이 workflow를 실행하지 않는다. Package가
  registry에 생성된 직후 `release.yml`/`npm-release`/`npm publish` binding을 등록하고 이후 release부터 사용한다.
- Remote CI run `29517178243`에서 workflow contract, package matrix, full tests, coverage, rendering, Jekyll build와
  desktop/mobile documentation checks가 모두 통과했다.
