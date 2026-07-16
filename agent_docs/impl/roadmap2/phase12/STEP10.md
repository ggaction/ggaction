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
- [x] Full local and remote release qualification passes
- [x] Immutable `v0.0.2` tag points to the corrective candidate
- [x] Protected release workflow publishes through npm trusted publishing
- [x] GitHub Release and npm `latest` identify `0.0.2`
- [x] Fresh registry runtime, browser, PNG and TypeScript consumers pass
- [x] Phase 12 and Roadmap 2 closeout completed

## 승인과 실행 경계

사용자는 2026-07-17 `0.0.2` corrective release 완료까지 명시적으로 승인했다. 같은 version을 수동으로 중복
publish하지 않는다. Candidate qualification 뒤 annotated tag를 push하고, default branch의 `release.yml`을
matching tag input으로 실행한다. Workflow는 그 tag를 checkout하고 exact commit을 검증한다. `npm-release`
environment 승인 뒤 OIDC publish와 GitHub Release가 같은 workflow에서 완료돼야 한다.

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

## First workflow attempt

Release run `29519776355`는 publish job 전에 중단됐고 registry mutation은 없었다. Verify job이 Node 24에서
primitive/public graphical equality의 sub-ULP 차이를 발견했다. Package candidate가 아니라 qualification runtime
선택의 문제이므로 immutable `v0.0.2` tag는 유지한다. Workflow definition은 default branch에서 실행하고 exact
annotated tag를 checkout/검증하며, full qualification은 canonical Node 20, OIDC publish는 Node 24에서 실행하도록
수정했다.

Release run `29519959283`도 publish 전 중단됐다. Workflow가 tag를 정확히 checkout했지만 candidate tag에 포함된
기존 helper가 `GITHUB_REF`를 직접 읽는 compatibility contract를 유지하고 있었다. Default-branch orchestrator는
pack/verify helper에 이미 검증한 effective tag ref를 명시적으로 전달하고, annotated tag/commit 검사는 workflow와
helper 양쪽에서 계속 수행한다.

Release run `29520061916`은 full Node 20 suite까지 통과하고 coverage 단계에서 publish 전에 중단됐다. Coverage
tooling은 canonical CI와 같이 Node 22 provider contract를 사용해야 한다. Release verify를 full equality Node 20,
coverage/documentation Node 22, trusted-publishing Node 24로 분리해 기존 CI runtime ownership과 일치시켰다.

## Canonical workflow and registry evidence

Release run [`29520189000`](https://github.com/hj-n/ggaction/actions/runs/29520189000)은 exact annotated tag와 commit,
1100 tests, coverage floors, installed-package consumers, Jekyll/browser documentation, 77 PNG variants와 package
boundary를 모두 검증했다. 첫 publish job은 protected environment가 default-branch orchestrator를 허용하지 않아
registry mutation 전에 거절됐다. `npm-release` environment에 `main` deployment policy를 추가한 뒤 같은 run의
failed publish job만 재실행하고 reviewer 승인을 거쳐 OIDC publish와 GitHub Release 생성을 완료했다.

```text
approved commit       fc144beb896ea2bdf50570eddf7adb03b336568e
tag                   v0.0.2
workflow artifact     ggaction-v0.0.2
entries               221
packed                203386 bytes
unpacked              926913 bytes
SHA-1                 87e4210a12a4949c1e6036dfd6e91a0f537504dc
SHA-256               b8ec5879e6aba08432cef5dc13a01ae216cb35c2a7828f035fdc06ab149e26e7
npm integrity         sha512-oAomgGW91masco17LY5GLeftuG1gl4ihAI/mp9LQGciEAqDWoKAVn05BMOW5S8vgeDshqZVRsb8ISiXJEmFKlA==
internal AGENTS.md    absent
```

Retained workflow artifact와 registry에서 다시 받은 tarball의 SHA-1/SHA-256이 정확히 같다. npm metadata는
provenance attestation, `latest -> 0.0.2`와 GitHub Actions OIDC publisher를 보고한다. Fresh registry consumer에서
main, extension, PNG, TypeScript, private-subpath rejection과 browser render가 모두 통과했고 public docs도
`0.0.2` install flow를 제공한다. 기능상 정상인 `0.0.1`은 deprecate하거나 unpublish하지 않았다.
