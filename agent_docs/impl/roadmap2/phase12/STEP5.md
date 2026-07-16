# Roadmap 2 — Phase 12 Step 5: Release Documentation and Runbook

## 목표

Repository-build 안내를 실제 npm install flow로 전환하고, 첫 릴리스와 이후 릴리스를 위한 versioning/recovery
runbook을 작성한다.

## 진행 상태

- [x] README development-status notice updated for `0.0.1`
- [x] `npm install ggaction` and three public entry examples verified and documented
- [x] Public docs installation, compatibility and package links updated
- [x] `CHANGELOG.md` initialized with `0.0.1` scope and known limitations
- [x] Release notes generated from the same `0.0.1` record
- [x] Version bump, candidate, approval, tag, publish and verification runbook added
- [x] Failure handling covers pre-publish abort, deprecate and next-patch recovery
- [x] Generated LLM docs and navigation remain fresh
- [x] Documentation, built-site, desktop and mobile checks pass
- [x] STEP status, conceptual commit and push

Remote CI run `29516731978` built the Jekyll site and passed generated-doc,
built-link, desktop, narrow-mobile, standard-mobile, and tablet browser checks.

## 문서 경계

Public docs와 README는 영어로 작성한다. Internal release plan/runbook은 협업을 위해 한국어로 작성할 수 있다.
문서는 unpublished local command를 성공한 public install처럼 표시하지 않으며 STEP8 publish 뒤 registry URL과
실제 install 결과를 최종 확인한다.

## 완료 조건

A new user can install and use the package from public documentation, while a maintainer can execute or recover a later
release without reconstructing the process from CI files.
