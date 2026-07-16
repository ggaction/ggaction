# Roadmap 2 — Phase 12 Step 6: Secure Repeatable Publishing Automation

## 목표

GitHub tag와 protected release environment에서 exact commit을 검증하고 npm에 배포하는 reusable workflow를 만든다.

## 진행 상태

- [ ] Dedicated release workflow added with least-privilege permissions
- [ ] Tag and package-version equality enforced
- [ ] Clean checkout, `npm ci`, full quality gates and package-consumer checks enforced
- [ ] Release artifact is packed once and the reviewed artifact identity is retained
- [ ] GitHub-hosted OIDC permission configured without a committed npm token
- [ ] npm trusted publisher configuration procedure documented and verified
- [ ] Protected GitHub release environment and approval policy configured
- [ ] Tag/release protection and concurrent duplicate-publish prevention configured
- [ ] GitHub Release creation and npm publish failure boundaries defined
- [ ] Workflow syntax and safe non-publishing path verified
- [ ] STEP status, conceptual commit and push

## Bootstrap policy

Trusted publisher는 npm package가 존재한 뒤 package settings에 exact GitHub owner/repository/workflow filename과
environment를 등록한다. First publish에 별도 authenticated bootstrap이 필요하면 Gate A에서 승인한 최소 절차만
사용하고, `0.0.1` 직후 trusted publisher를 연결해 subsequent release에서 long-lived automation token을 제거한다.

Release workflow는 `id-token: write`와 필요한 최소 `contents` permission만 사용한다. Publish job은 GitHub-hosted
runner에서 실행하고 cache에 의존하지 않으며 protected environment approval을 통과해야 한다.

## 완료 조건

Future releases can be made from a reviewed version/tag through one protected OIDC workflow, with no reusable npm secret
stored in the repository.
