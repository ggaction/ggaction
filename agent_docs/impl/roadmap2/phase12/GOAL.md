# Roadmap 2 — Phase 12 Goal

## 목표

완료된 `ggaction` public package를 npm public registry에 `0.0.1`로 처음 배포하고, 이후 버전도 같은 검증과
승인 절차를 거쳐 반복 배포할 수 있는 GitHub/npm release pipeline을 만든다. 이번 Phase는 새 chart action이나
runtime behavior를 추가하지 않는다. 배포되는 package artifact, 설치 후 public entry point, 문서, version/tag,
GitHub Release와 npm registry 결과가 하나의 release contract로 일치하도록 만드는 것이 목표다.

## 진행 상태

- [x] First public version fixed as `0.0.1`
- [x] Release ownership, license, repository visibility and registry contract approved at Gate A
- [x] Public package metadata and legal files completed
- [x] Minimal deterministic npm package artifact completed
- [x] Packed-package runtime, browser, PNG and TypeScript consumer tests completed
- [x] Public installation documentation, changelog and release runbook completed
- [x] Secure repeatable GitHub/npm publishing automation completed
- [x] `0.0.1` release candidate approved at Gate B
- [x] npm `0.0.1` and matching GitHub Release published
- [ ] Corrective `0.0.2` package approved, published and verified through OIDC
- [ ] Registry, fresh-install, documentation and rollback verification completed
- [ ] Roadmap 2 release closeout completed

## 배포 대상

```text
npm package        ggaction@0.0.1
npm access         public, unscoped
dist-tag           latest
Git tag            v0.0.1
GitHub Release     v0.0.1
public entries     ggaction, ggaction/extension, ggaction/png
Node support       package.json engines contract
documentation      deployed public docs + npm README
```

`0.0.1`은 첫 실험적 공개 릴리스다. 현재 API를 안정적인 `1.0.0` 계약으로 선언하지 않으며, 이후 변경은
semantic version과 release notes로 명시한다.

## Release invariants

- Registry에 올라가는 bytes는 Git tag가 가리키는 commit에서 재현 가능해야 한다.
- `package.json` version, lockfile root version, Git tag, GitHub Release와 npm version은 정확히 일치해야 한다.
- Package는 explicit allowlist를 사용하며 test, internal agent records, workflow, generated artifact와 secret을
  포함하지 않는다.
- Source repository import가 아니라 packed tarball을 fresh consumer project에 설치해 세 public entry point를
  검증한다.
- Default browser entry에는 Node filesystem/native PNG dependency가 유입되지 않아야 한다.
- Publish workflow는 long-lived npm token보다 GitHub-hosted OIDC trusted publishing을 최종 상태로 사용한다.
- 실제 publish는 Gate B 승인 전 실행하지 않는다.
- 이미 배포된 version을 다시 쓰지 않는다. 잘못된 release는 새 patch version, deprecation 또는 npm policy가
  허용하는 명시적 recovery로 처리한다.

## 중요한 결정 경계

### Gate A — Release contract

다음 항목은 구현 전에 사용자와 확정한다.

- License 선택과 `LICENSE`/package metadata
- GitHub repository의 현재 public visibility 유지 여부
- npm owner account와 `ggaction` package-name 최종 확인
- `0.0.1`, unscoped public package, `latest` dist-tag 확인
- First publish 인증 방식과 이후 trusted publisher 전환 순서
- GitHub release environment의 approval/protection policy

현재 public repository를 유지하면 npm provenance와 source/documentation 접근성을 함께 제공할 수 있다.
Gate A 승인 전에는 license를 추정하거나 visibility를 다시 변경하지 않는다.

Gate A는 2026-07-17 사용자 승인을 받았다. License는 MIT, copyright holder는 Hyeon Jeon, npm owner는
`hyeonjeon`으로 확정했고 GitHub repository는 public 상태를 유지한다. First publish는 user npm account의
interactive 2FA bootstrap을 사용하며 subsequent release는 protected `npm-release` environment와 GitHub-hosted
OIDC trusted publisher를 사용한다.

### Gate B — Irreversible publish approval

실제 publish 직전에 다음 evidence를 함께 제시한다.

- Exact release commit, `v0.0.1` target과 clean worktree
- Final `package.json`, license와 release notes
- `npm pack --dry-run` file inventory, packed/unpacked size와 forbidden-file audit
- Fresh tarball consumer tests for all public entries and declarations
- Full CI, coverage, render, docs and release-workflow validation
- Exact publish trigger, npm account/package ownership and recovery procedure

Gate B의 명시적 승인 뒤에만 tag/release/publish를 실행한다.

## 실행 순서

```text
STEP1   release baseline audit and Gate A contract
  ↓ Gate A
STEP2   package metadata, license and public identity
STEP3   minimal deterministic package artifact
STEP4   installed-consumer and compatibility qualification
STEP5   versioning, public docs, changelog and release runbook
STEP6   GitHub/npm trusted publishing automation
STEP7   0.0.1 release candidate and Gate B
  ↓ Gate B
STEP8   publish npm package and matching GitHub Release
STEP9   post-publish verification and Roadmap 2 closeout
STEP10  corrective 0.0.2 package and OIDC release closeout
```

## 완료 조건

- `npm install ggaction@0.0.2`가 fresh project에서 성공한다.
- `ggaction`, `ggaction/extension`, `ggaction/png`의 runtime and declaration contract가 packed and registry
  install에서 모두 통과한다.
- npm package page, version, integrity, dist-tag, repository/homepage/license metadata와 GitHub Release가 일치한다.
- Public docs의 install flow가 실제 registry package로 실행된다.
- 이후 release는 documented version bump, release candidate checks, protected approval와 OIDC workflow만으로
  재현할 수 있다.
- Roadmap 2는 implementation뿐 아니라 첫 public distribution과 registry verification까지 완료된다.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
- [`STEP9.md`](STEP9.md)
- [`STEP10.md`](STEP10.md)
