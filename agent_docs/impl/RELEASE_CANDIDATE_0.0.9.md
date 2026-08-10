# ggaction 0.0.9 release record

## 진행 상태

- [x] Roadmap 5.3~5.4 LLM authoring knowledge와 local MCP closeout
- [x] Package, lockfile, README와 docs version을 `0.0.9`로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.9` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` 승인
- [x] npm, GitHub Release와 GitHub Pages 결과 검증

## Version 결정

`0.0.8` 이후 local read-only stdio MCP, generated compact action knowledge, multi-intent task packet과 executable
renderer bootstrap을 추가했다. 문서에는 LLM/MCP 사용법과 576-run authoring benchmark의 compact aggregate를 연결했고,
raw request trace, checkpoint와 intermediate result는 public source와 package에서 제외했다. 기존 pre-1.0 release
sequence와 일치하도록 다음 version을 `0.0.9`로 정하고 package, lockfile, README status, docs config, generated LLM
bundle, package contract test와 changelog를 같은 version으로 정렬했다.

## Qualification 증거

Final release commit은 `a00fa875821aff08fbd783e17e3b1075528a4ab6`이며 annotated `v0.0.9` tag가 이
commit을 가리킨다. `main` CI run `31357158496`과 exact tag ref에서 실행한 Release workflow
`31357430070`이 다음 검증을 모두 통과했다.

- 전체 테스트: `2,090/2,090` 통과
- Node 20/22/24 package consumer와 coverage threshold 및 critical floor 통과
- generated contract/docs drift, package contents와 installed JavaScript/TypeScript/MCP consumer 검증 통과
- Browser package와 documentation consumer, Canvas/PNG renderer regression chart 검증 통과
- canonical package: entry `420`, packed `429,896` bytes, unpacked `2,196,026` bytes

## Release 결과

- Final workflow: `31357430070`, final conclusion `success`, dispatch ref `v0.0.9`
- Canonical tarball SHA-1: `60354a5b270f7e80a0fc92bce75ee0dbce5744b7`
- Canonical tarball SHA-256: `99eb1d21e9d09d0c01730d88d1f641249832c5f3c016e053a5629bf72e3dfd3b`
- npm `ggaction@0.0.9`의 `dist.shasum`은 canonical SHA-1과 정확히 일치하며 `latest`는 `0.0.9`이다.
- GitHub Release [`v0.0.9`](https://github.com/ggaction/ggaction/releases/tag/v0.0.9)는 draft나 prerelease가
  아닌 public release다.
- GitHub Pages는 exact tag에서 빌드되었고 [`/ggaction/`](https://ggaction.github.io/ggaction/)가 `0.0.9`와
  `Experimental 0.0.9` release status를 표시한다.

## Release 실행 경계

Roadmap 구현 PR `#27`과 release preparation PR `#28`은 각각 required checks를 통과한 뒤 merge했다. 사용자가
package publish, GitHub Release와 documentation deploy를 승인한 뒤 protected workflow의 `npm-release` environment를
승인했다. Verify job이 exact annotated tag에서 만든 하나의 canonical artifact를 publish job이 그대로 재사용했고,
npm, GitHub Release와 Pages는 모두 같은 tag commit을 기준으로 생성되었다.

Release workflow는 verify `9m 20s`, publish `22s`, Pages build `27s`, Pages deploy `10s`로 모두 성공했다.
