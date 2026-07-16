# Roadmap 2 — Phase 12 Step 8: Publish `0.0.1`

## 목표

Gate B에서 승인한 exact candidate를 npm과 GitHub에 한 번만 배포하고 matching public release identity를 만든다.

## 진행 상태

- [x] Gate B approval recorded
- [x] Final candidate commit and package version rechecked immediately before mutation
- [x] `ggaction@0.0.1` published to npm public registry
- [x] `latest` dist-tag resolves to `0.0.1`
- [x] Immutable `v0.0.1` tag points to the approved commit
- [x] GitHub Release `v0.0.1` published with approved notes
- [x] npm package metadata links to the intended documentation/repository
- [x] Trusted publisher connected for subsequent releases
- [x] No duplicate publish or tag race occurred
- [x] Publish outputs and registry integrity recorded

## 실행 경계

Publish는 승인된 workflow 또는 Gate A가 정한 first-release bootstrap만 사용한다. 실패 시 같은 version에 다른
bytes를 재시도하려 하지 않고 registry state를 먼저 확인한다. npm에 version이 존재하면 그 artifact를 기준으로
post-publish verification 또는 recovery를 진행한다.

## 완료 조건

The approved commit, npm version, dist-tag, Git tag and GitHub Release identify one immutable `0.0.1` artifact.

## Release record

```text
approved commit      111059b2240c2198591b339f8d0cd1c12b12a1ac
Git tag              v0.0.1 -> approved commit
npm package          ggaction@0.0.1
dist-tag             latest -> 0.0.1
registry SHA-1       cac0892dbf54f809cd5e0da9a7f61de4ab325c77
registry SHA-256     105d4ad963511717dba9d49fa42583393b2c3319212827b6542df78f767dcf5d
registry SRI         sha512-RbNeQUxyQZIK8kGD/BcegtyHYx2CRFJcKv6twXlQURS3z4r8zE1+HTAWGjuYQBmpQ+1N20xFGz2bib/PJtD1xw==
GitHub Release       https://github.com/hj-n/ggaction/releases/tag/v0.0.1
public docs          https://hyeonword.com/ggaction/
recovery used        no
```

Interactive browser 2FA로 exact tarball을 한 번만 publish했다. Package 생성 뒤 npm CLI `11.18.0`으로
`hj-n/ggaction`의 `release.yml`, `npm-release` environment와 `npm publish` permission을 trusted publisher에
연결했다. Publishing access는 `mfa=publish`로 설정해 2FA를 요구하고 token publish를 허용하지 않는다.
