# Roadmap 2 — Phase 12 Step 10: Corrective `0.0.2` Release

## 목표

`0.0.1` tarball에 포함된 internal instruction file을 제거하고 executable package audit를 보강한 corrective
`0.0.2`를 protected OIDC workflow로 배포한다. `0.0.1`은 기능상 정상이고 공개 repository와 같은 내용만 포함하므로
deprecate하거나 unpublish하지 않는다.

## 진행 상태

- [x] `src/AGENTS.md` package inclusion diagnosed and recorded
- [x] Package allowlist excludes internal instruction files
- [x] Forbidden internal basename audit and regression coverage added
- [x] Corrective patch version fixed as `0.0.2`
- [x] Package, lockfile, changelog, docs and release notes agree on `0.0.2`
- [x] Exact 221-file tarball and hashes recorded
- [ ] Full local and remote release qualification passes
- [ ] Immutable `v0.0.2` tag points to the corrective candidate
- [ ] Protected release workflow publishes through npm trusted publishing
- [ ] GitHub Release and npm `latest` identify `0.0.2`
- [ ] Fresh registry runtime, browser, PNG and TypeScript consumers pass
- [ ] Phase 12 and Roadmap 2 closeout completed

## 승인과 실행 경계

사용자는 2026-07-17 `0.0.2` corrective release 완료까지 명시적으로 승인했다. 같은 version을 수동으로 중복
publish하지 않는다. Candidate qualification 뒤 annotated tag를 push하고, `release.yml`을 그 tag ref와 matching
input으로 한 번만 실행한다. `npm-release` environment 승인 뒤 OIDC publish와 GitHub Release가 같은 workflow에서
완료돼야 한다.

## 완료 조건

Public registry의 `ggaction@0.0.2` tarball에 internal instruction file이 없고, `latest`, Git tag, GitHub Release,
trusted publisher workflow와 fresh consumers가 하나의 immutable corrective artifact를 식별한다.

## Candidate evidence

```text
package              ggaction@0.0.2
intended tag         v0.0.2
dist-tag             latest
entries              221
packed               202815 bytes
unpacked             926913 bytes
SHA-1                a1127e24d57c5dd9ebcbf1fa7e111d68edcf6816
SHA-256              40ca0983025bd95b1ab0b395b58e512da71533653d66bdbf63747ae69658fc1b
internal AGENTS.md   absent
dependency audit     0 vulnerabilities
```

Local qualification은 1100 normal tests, 95.09% lines / 90.69% branches / 98.24% functions와 23 critical coverage
floors, package consumers, browser checks, 77 render variants, generated gallery와 documentation checks를 통과했다.
