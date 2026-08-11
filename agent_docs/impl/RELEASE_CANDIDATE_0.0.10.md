# ggaction 0.0.10 release record

## 진행 상태

- [x] Installed extension-authoring knowledge와 public `registerExtension` API 통합
- [x] Package, lockfile, README, docs와 CDN example version을 `0.0.10`으로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.10` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` 승인
- [x] npm, GitHub Release, jsDelivr와 GitHub Pages 결과 검증

## Version 결정

`0.0.9` 이후 installed package에 extension feature 설계, ggaction action 재사용, lifecycle ownership,
primitive parity와 package-consumer evidence를 안내하는 compact authoring knowledge를 추가했다. Installable
extension package가 자체 `ChartProgram` factory 없이 standard `chart()` program에 action을 합성할 수 있도록
collision-safe import-time `registerExtension({ name, actions })` API와 strict TypeScript module augmentation도
추가했다. 기존 pre-1.0 release sequence와 일치하도록 다음 version을 `0.0.10`으로 정하고 package,
lockfile, README status, docs config, generated LLM bundle, Quarto CDN example, package contract test와
changelog를 같은 version으로 정렬했다.

## Qualification 증거

Final release commit은 `8ece00e9b49ffd37a8e7b0d644a314a88c31b4a9`이며 annotated `v0.0.10` tag가 이
commit을 가리킨다. Release preparation PR `#32`의 CI run `31502759733`과 exact tag ref에서 실행한
Release workflow `31503312366`이 다음 검증을 모두 통과했다.

- 전체 테스트: `2,099/2,099` 통과
- Coverage: line `94.7%`, branch `90.18%`, function `98.4%`와 critical floor `70/70` 통과
- Node 20/22/24 package consumer, strict TypeScript, extension registration과 browser bundle 검증 통과
- Generated contract/docs drift, package contents, Browser package/documentation consumer와 Jekyll build 검증 통과
- Canvas/PNG renderer regression과 public package install smoke 검증 통과
- Canonical package: entry `422`, packed `435,418` bytes, unpacked `2,213,609` bytes

## Release 결과

- Final workflow: `31503312366`, final conclusion `success`, dispatch ref `v0.0.10`
- Canonical tarball SHA-1: `39bf8c1be3708f978fd483317ad631e98713c6d1`
- Canonical tarball SHA-256: `3957f25f996838b71bb1d009323693c5fbb7813e1ec1d3599bacc22a1484ea94`
- npm `ggaction@0.0.10`의 `dist.shasum`은 canonical SHA-1과 정확히 일치하며 `latest`는 `0.0.10`이다.
- Public registry에서 새로 설치한 `ggaction@0.0.10`으로 `action()`, `registerExtension()`과 standard
  `chart()` action chain을 실행했다.
- GitHub Release [`v0.0.10`](https://github.com/ggaction/ggaction/releases/tag/v0.0.10)는 draft나
  prerelease가 아닌 public release다.
- jsDelivr exact-version ESM entry가 `0.0.10`을 반환하고 canonical Quarto/OJS program을 실행했다.
- GitHub Pages는 exact tag에서 빌드되었고 [`/ggaction/`](https://ggaction.github.io/ggaction/)가
  `0.0.10`과 `Experimental 0.0.10` release status를 표시한다.

## Release 실행 경계

Extension registration PR `#31`과 release preparation PR `#32`는 각각 required checks를 통과한 뒤
merge했다. 사용자가 package publish 결과 검증까지 승인한 뒤 protected workflow의 `npm-release`
environment를 승인했다. Verify job이 exact annotated tag에서 만든 하나의 canonical artifact를 publish
job이 그대로 재사용했고, npm, GitHub Release와 Pages는 모두 같은 tag commit을 기준으로 생성되었다.

Release workflow는 verify `10m 8s`, publish `37s`, Pages build `37s`, Pages deploy `16s`로 모두 성공했다.
