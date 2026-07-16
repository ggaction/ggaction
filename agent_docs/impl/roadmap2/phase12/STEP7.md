# Roadmap 2 — Phase 12 Step 7: `0.0.1` Release Candidate and Gate B

## 목표

실제 registry mutation 없이 final `0.0.1` candidate를 만들고 irreversible publish 승인을 요청한다.

## 진행 상태

- [ ] Release commit selected and worktree confirmed clean
- [ ] Version, lockfile, tag target, changelog and release notes agree
- [ ] Full local and remote CI passes on the exact candidate commit
- [ ] Final tarball inventory, sizes, integrity and dependency audit recorded
- [ ] Fresh installed-consumer matrix passes against the exact tarball
- [ ] Documentation and public install snippets pass against the candidate
- [ ] npm owner/authentication and package-name availability rechecked
- [ ] Release workflow dry/safe path and environment approval verified
- [ ] Recovery procedure and exact publish sequence shown to the user
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
