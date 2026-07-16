# Roadmap 2 — Phase 12 Step 2: Package Identity and Metadata

## 목표

Gate A 결정을 `package.json`, legal files와 repository metadata에 반영하고 `0.0.1` public identity를 하나로
고정한다.

## 진행 상태

- [ ] `package.json` and lockfile root version changed atomically to `0.0.1`
- [ ] Description, license, repository, homepage, bugs, keywords and author/maintainer metadata completed
- [ ] Explicit public registry and dist-tag publish configuration completed
- [ ] User-approved `LICENSE` added
- [ ] Public README links converted to registry-safe absolute destinations where needed
- [ ] Package name/version/repository metadata validation added
- [ ] Runtime entry and declaration maps re-audited
- [ ] Metadata changes verified without publishing
- [ ] STEP status, conceptual commit and push

## 계약

Metadata validation은 package name, semver, repository URL, public entries와 declaration mapping을 machine-check한다.
Version은 release commit 전에 한 곳만 수동으로 바꾸고 lockfile은 package manager가 같은 변경으로 갱신한다.

## 완료 조건

Every public identity and legal field is explicit, internally consistent and testable before any package artifact is
created.
