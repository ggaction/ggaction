# Roadmap 3 Phase 12 — Source Refactor, Repository Transfer, and 0.0.4

## 진행 상태

- [x] STEP 1 — Source baseline audit와 Gate A refactor contract
- [x] STEP 2 — Core program state와 immutable transition 분리
- [x] STEP 3 — Grammar ownership, statistics와 충돌 경로 정리
- [x] STEP 4 — Mark와 encoding orchestration 정리
- [x] STEP 5 — Scale consumer와 materialization policy 정리
- [x] STEP 6 — Guide, layout와 facet composition 정리
- [x] STEP 7 — Renderer와 source package boundary 정리
- [ ] STEP 8 — Comprehensive integration과 Gate B
- [ ] STEP 9 — GitHub organization/transfer preflight
- [ ] STEP 10 — Repository transfer와 Gate C
- [ ] STEP 11 — `0.0.4` release candidate, release-only docs와 Gate D
- [ ] STEP 12 — npm publish, GitHub Release, Pages와 Roadmap 3 closeout

## 목표

현재 공개 API, stored schema, semantic/graphic result와 action trace를 바꾸지 않고 `src/`의 책임 경계를
정리한다. 리팩터링이 검증된 뒤 repository를 `hj-n/ggaction`에서 새 `ggaction/ggaction`으로 이전하고,
release-scoped public documentation pipeline과 trusted publishing을 새 identity에서 검증한 뒤 `0.0.4`를
배포한다.

## 범위

- Production implementation refactor는 `src/`에만 한정한다.
- 테스트는 동작 불변성과 새 module boundary를 기계적으로 증명하는 데 필요한 경우에만 추가·수정한다.
- Public API, TypeScript signature, semantic/graphic schema, trace operation과 observable chart output은 바꾸지 않는다.
- Public `docs/`, `README.md`, generated references와 public example 내용은 STEP 11 release preparation에서 한 번에
  갱신한다.
- Internal Phase/architecture/contract 문서는 개발 중 계속 최신 상태를 유지한다.
- Transfer와 publish는 각각 명시적 Gate 승인 뒤 수행한다.

## 제외 범위

- 신규 chart capability, action, option과 accepted value
- 기존 finding과 무관한 bug fix
- public resource ID, generated graphic ID 또는 trace hierarchy 변경
- package name 변경
- organization 생성 전 repository transfer 시도
- release candidate 승인 전 npm publish 또는 tag 생성

## Gate

### Gate A — Refactor contract

Source 기준선, 위험, tranche 순서와 동작 불변 조건을 승인한다. 승인 전 `src/`는 수정하지 않는다.

### Gate B — Refactor result

모든 source tranche, architecture record, normal/coverage/package/browser/render 검증과 output equivalence를
승인한다.

### Gate C — Transfer

사용자가 `ggaction` organization을 만든 뒤 권한, Actions, Pages, trusted publishing과 rollback checklist를
검토한다. Transfer 실행 직전 승인하고, 이전 후 새 repository에서 전체 CI가 통과해야 닫는다.

### Gate D — `0.0.4` release candidate

Exact tag commit, public docs, metadata, changelog, tarball hash, fresh consumer와 release notes를 승인한다.
승인 전 npm publish와 GitHub Release를 만들지 않는다.

## 완료 조건

- Source dependency cycle 0개와 approved owner direction이 executable contract로 유지된다.
- Public action 139개와 internal wrapped action 75개의 registration, trace와 behavior가 유지된다.
- Normal, coverage, package, Node 20/22/24, browser, PNG와 built docs 검증이 통과한다.
- `ggaction/ggaction`이 canonical repository이고 이전 URL redirect와 package metadata가 정확하다.
- Public documentation은 exact `0.0.4` release에서만 배포된다.
- npm `ggaction@0.0.4`, annotated tag, GitHub Release, Pages와 provenance가 같은 commit을 가리킨다.
