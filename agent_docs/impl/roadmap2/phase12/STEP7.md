# Roadmap 2 — Phase 12 Step 7: `0.0.1` Release Candidate and Gate B

## 목표

실제 registry mutation 없이 final `0.0.1` candidate를 만들고 irreversible publish 승인을 요청한다.

## 진행 상태

- [x] Release commit selected and worktree confirmed clean
- [x] Version, lockfile, tag target, changelog and release notes agree
- [x] Full local and remote CI passes on the exact candidate commit
- [x] Final tarball inventory, sizes, integrity and dependency audit recorded
- [x] Fresh installed-consumer matrix passes against the exact tarball
- [x] Documentation and public install snippets pass against the candidate
- [x] npm owner/authentication and package-name availability rechecked
- [x] Release workflow dry/safe path and environment approval verified
- [x] Recovery procedure and exact publish sequence shown to the user
- [ ] Explicit Gate B approval before STEP8

## Gate B review package

```text
release commit + clean status
package/version/tag/release identity
tarball manifest + sizes + integrity
runtime/browser/png/types consumer results
full CI/docs/render/coverage results
exact first-publish and later OIDC workflow
release notes + recovery procedure
```

## 완료 조건

The user approves the exact immutable candidate and publish mechanism with no remaining code, metadata, authentication or
artifact uncertainty.

## Candidate evidence

이 evidence record를 포함하는 commit을 exact release candidate로 사용한다. Commit SHA와 clean status는 Gate B
요청에서 다시 출력하며, 이후 package byte나 release metadata가 바뀌면 기존 승인은 무효다.

```text
package              ggaction
version              0.0.1
intended tag         v0.0.1
dist-tag             latest
tarball              ggaction-0.0.1.tgz
entries              222
packed               210847 bytes
unpacked             950629 bytes
SHA-1                cac0892dbf54f809cd5e0da9a7f61de4ab325c77
SHA-256              105d4ad963511717dba9d49fa42583393b2c3319212827b6542df78f767dcf5d
SRI                  sha512-RbNeQUxyQZIK8kGD/BcegtyHYx2CRFJcKv6twXlQURS3z4r8zE1+HTAWGjuYQBmpQ+1N20xFGz2bib/PJtD1xw==
```

## Qualification results

- Normal suite: 1100/1100 tests passed.
- Coverage: 95.09% lines, 90.71% branches, 98.24% functions; all 23 critical floors passed.
- Render suite: all 77 Roadmap 2 variants and the generated gallery passed.
- Packed consumer: JavaScript main entry, extension entry, Node PNG, TypeScript declarations and private-subpath rejection
  passed against the exact tarball.
- Browser package entry and all registered examples passed without browser errors.
- Dependency audit reported 0 vulnerabilities. The production tree resolves `@napi-rs/canvas@1.0.2` and the matching
  Darwin ARM64 adapter; other platform adapters remain expected optional dependencies.
- Generated image manifest and LLM documentation were fresh. Remote CI verifies Jekyll output and desktop/mobile/tablet
  documentation against the exact candidate commit.

## Registry and automation state

- Authenticated npm account: `hyeonjeon`; email verified; 2FA mode `auth-and-writes`; no pending 2FA change.
- `ggaction` returns registry E404 immediately before Gate B and is not currently owned or published.
- GitHub workflow `release.yml` is manual-only, tag-bound and has no publish run. Future releases use Node 24, npm
  `^11.5.1`, OIDC and no npm token.
- `npm-release` requires reviewer `hj-n` and allows only matching `v*` tag deployments. Release concurrency permits one
  publish at a time.

## Exact bootstrap sequence after Gate B

```text
1. Confirm candidate SHA and clean worktree again.
2. Create annotated tag v0.0.1 at that exact commit and push the tag.
3. Publish .artifacts/release/ggaction-0.0.1.tgz as public/latest with interactive 2FA.
4. Create GitHub Release v0.0.1 from the generated CHANGELOG notes.
5. Bind ggaction to hj-n/ggaction + release.yml + npm-release for OIDC npm publish.
6. Restrict package publishing access, then run STEP9 registry/fresh-install verification.
```

If failure occurs before npm publish, abort without creating a release. If npm succeeds but GitHub Release creation fails,
retry only the GitHub Release. Never overwrite or routinely unpublish a public version; deprecate it when necessary and
publish a corrected patch version. The full procedure is in [`RELEASE_RUNBOOK.md`](RELEASE_RUNBOOK.md).
