# ggaction 0.0.5 release record

## 진행 상태

- [x] Roadmap 4 P15-Exit 승인과 closeout
- [x] Patch version `0.0.5` 추천 및 package/lock/docs version 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 전체 qualification과 checksum
- [x] Annotated `v0.0.5` tag 생성
- [x] Protected Release workflow dispatch
- [x] npm/GitHub Release/Pages 결과 검증

## Version 결정

`0.0.4`는 이미 공개되었고 Roadmap 4의 surface는 additive capability와 backward-compatible repair다. 현재
pre-1.0 release sequence와 일치하도록 다음 candidate를 `0.0.5`로 준비한다. Package, lockfile, docs version,
README status, hard-coded package tests와 changelog가 같은 version을 사용한다.

## Qualification 증거

Runtime/package source candidate는 `1e8022bed372ae73ad00a3cbc2bbb5e2e567bd9c`에서 처음 qualification했다.
최종 release commit `fc9be0216a33a36edd1d6458b10e708e6be5f1fb`은 qualification 기록과 공개 문서
정렬을 포함한다. 이후 변경은 배포 package contents를 바꾸지 않았고 annotated `v0.0.5` tag는 이 최종 commit을
가리킨다.

- 전체 테스트: `1,831/1,831` 통과
- coverage: line `94.63%`, branch `89.94%`, function `98.72%`; critical floor `68/68` 통과
- Browser Canvas: `47/47` 통과
- Node PNG: `124/124` 통과; approved gallery `123`, active review `0`
- 문서: source check `37/37`, 정적 페이지 `110`, 320/390/768px 브라우저 검증 통과
- action catalog drift, package contents check, consumer installation과 private export rejection 통과
- local preflight package: `ggaction-0.0.5.tgz`, entry `380`, packed `345,048` bytes, unpacked
  `1,616,242` bytes
- local preflight SHA-256: `9658736bf4b4a16ffea54d462d6776907fcff5ba7e37065e4c8e4a94488e6d33`

README와 documentation home의 product positioning을 정렬한 뒤에도 package artifact의 내용과 checksum은
동일했다. 검증은 release workflow와 같은 package version에서 수행했으며, generated docs와 package artifact를
다시 생성해도 의도한 문서 변경 외의 tracked worktree가 변하지 않았다.

## Release 결과

- Workflow: `29815099176`, final conclusion `success`
- Canonical workflow artifact: entry `380`, packed `345,710` bytes, unpacked `1,616,242` bytes
- Canonical SHA-1: `17df850f17a87d6ef81e2cbea3b27f40a3e906d8`
- Canonical SHA-256: `b665686872b32139b85056eec725e73c2c99870acb93c76f94993f3f412c3fa1`
- npm `ggaction@0.0.5`의 `dist.shasum`은 canonical SHA-1과 정확히 일치한다.
- GitHub Release `v0.0.5`는 draft나 prerelease가 아닌 public release로 생성되었다.
- GitHub Pages는 tag commit에서 빌드된 `0.0.5` 문서와 정렬된 product positioning을 제공한다.

초기 Pages deploy는 `github-pages` 환경이 `main` branch만 허용해 tag ref를 거부했다. 승인 후 기존 `main`
정책을 유지하고 `v*` tag policy를 추가했으며, failed job만 재실행해 전체 workflow를 성공으로 닫았다.

로컬 preflight archive와 canonical workflow archive는 package contents가 같아도 tool/runtime metadata 때문에
byte-identical하지 않을 수 있다. Registry provenance의 기준은 publish job이 재사용한 canonical workflow artifact다.

## Release 실행 경계

Release는 별도의 사용자 승인 후에만 실행했다. Tag 생성 전에는 npm, GitHub Release와 GitHub Pages를 변경하지
않았으며, publish와 documentation deploy는 모두 exact annotated tag에서 수행했다.

실제 release는 다음 순서를 사용했다.

1. Clean final candidate commit에 annotated `v0.0.5` tag를 만든다.
2. Tag를 push한다.
3. `.github/workflows/release.yml`을 exact tag input으로 dispatch한다.
4. Protected `npm-release` 승인을 거쳐 verify job이 만든 단일 artifact를 publish job이 그대로 재사용한다.
5. npm registry, GitHub Release, Pages와 provenance가 같은 tag commit을 가리키는지 확인한다.
