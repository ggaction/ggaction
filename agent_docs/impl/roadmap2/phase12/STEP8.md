# Roadmap 2 — Phase 12 Step 8: Publish `0.0.1`

## 목표

Gate B에서 승인한 exact candidate를 npm과 GitHub에 한 번만 배포하고 matching public release identity를 만든다.

## 진행 상태

- [ ] Gate B approval recorded
- [ ] Final candidate commit and package version rechecked immediately before mutation
- [ ] `ggaction@0.0.1` published to npm public registry
- [ ] `latest` dist-tag resolves to `0.0.1`
- [ ] Immutable `v0.0.1` tag points to the approved commit
- [ ] GitHub Release `v0.0.1` published with approved notes
- [ ] npm package metadata links to the intended documentation/repository
- [ ] Trusted publisher connected for subsequent releases
- [ ] No duplicate publish or tag race occurred
- [ ] Publish outputs and registry integrity recorded

## 실행 경계

Publish는 승인된 workflow 또는 Gate A가 정한 first-release bootstrap만 사용한다. 실패 시 같은 version에 다른
bytes를 재시도하려 하지 않고 registry state를 먼저 확인한다. npm에 version이 존재하면 그 artifact를 기준으로
post-publish verification 또는 recovery를 진행한다.

## 완료 조건

The approved commit, npm version, dist-tag, Git tag and GitHub Release identify one immutable `0.0.1` artifact.
