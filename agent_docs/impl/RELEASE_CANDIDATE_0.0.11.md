# ggaction 0.0.11 release record

## 진행 상태

- [x] 구현 branch의 patch-equivalence 확인과 중복 branch 정리
- [x] Package, lockfile, README, docs와 CDN example version을 `0.0.11`로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.11` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` 승인
- [x] npm, GitHub Release, jsDelivr와 GitHub Pages 결과 검증

## Version 결정

`0.0.10` 이후 production guidance, versioned action cards, hashed LLM section manifest와
machine-readable documentation artifacts를 추가했다. Binned quantitative line aggregate와 complete arc-sector
label을 구현하고, 50-source provenance-verified realistic corpus를 도입했다. Chart intent와 MCP task packet,
documentation search 및 LLM routing을 확장했으며 transform, scale, layout, selection, guide와 Canvas, PNG,
SVG, PDF renderer 경계를 강화했다. 기존 pre-1.0 release sequence와 일치하도록 다음 version을
`0.0.11`로 정하고 package, lockfile, README status, docs config, generated LLM bundle, Quarto CDN example,
package contract test와 changelog를 같은 version으로 정렬했다.

## Qualification 증거

Final release commit은 `8b1d64377474ff4e4d9502943966bea44d0d8cd8`이며 annotated `v0.0.11` tag가 이
commit을 가리킨다. Release preparation PR `#47`의 CI run `33527566764`, release image-drift guard PR
`#48`의 CI run `33531938835`, dependency-free verifier PR `#49`의 CI run `33543075224`와 exact tag
ref에서 실행한 Release workflow `33545706215`가 release를 검증한다.

- 전체 테스트: `2,251/2,251` 통과
- Coverage: line `95.22%`, branch `91.73%`, function `98.99%`와 critical floor `71/71` 통과
- Realistic corpus contract `167/167` 통과; 50개 pinned dataset 전체와 460-chart statistical facade
  schedule 검증 통과
- Node 20/22/24 package consumer, strict TypeScript, extension registration과 browser bundle 검증 통과
- Generated contract/docs drift, package contents, browser package/documentation consumer와 Jekyll build 검증 통과
- Canvas/PNG renderer regression과 public registry package consumer 검증 통과
- Canonical package: entry `423`, packed `462,349` bytes, unpacked `2,211,603` bytes

## Release 결과

- Final workflow: `33545706215`, final conclusion `success`, dispatch ref `v0.0.11`
- Canonical tarball SHA-1: `7d53f1f35344f4549eb572c68858245cd2302072`
- Canonical tarball SHA-256: `6f900b4e5f6b41edafa7db9dc5df5a4297a8c047a80acc8baf40634adf82e482`
- npm `ggaction@0.0.11`의 `dist.shasum`과 registry tarball SHA-256은 canonical hash와 정확히 일치하며
  `latest`는 `0.0.11`이다. Publish attestation과 SLSA provenance도 registry에 등록되었다.
- Public registry에서 새로 설치한 `ggaction@0.0.11`으로 Node, extension, PDF, PNG, SVG, strict
  TypeScript, browser bundle, tutorial consumer와 MCP 계약을 실행했다. Basic bundle은 gzip `119,377`
  bytes다.
- GitHub Release [`v0.0.11`](https://github.com/ggaction/ggaction/releases/tag/v0.0.11)는 draft나
  prerelease가 아닌 public release다.
- jsDelivr exact-version ESM entry가 `0.0.11`을 반환하고 canonical Quarto/OJS program을 실행했다.
- GitHub Pages는 exact tag에서 빌드되었고 [`/ggaction/`](https://ggaction.github.io/ggaction/)가
  `Experimental 0.0.11` release status를 표시한다.

## Release 실행 경계

Release preparation PR `#47`, cross-platform generated PNG verification fix PR `#48`과 dependency-free
publish verifier PR `#49`는 각각 required checks를 통과한 뒤 merge했다. 첫 exact-tag workflow
`33531545936`은 Ubuntu와 macOS native Canvas가 만든 PNG의 플랫폼별 byte 차이를 generated-doc drift로
감지해 publish 전에 중단되었고, npm package, GitHub Release와 Pages를 생성하지 않았다. JSON manifest,
Markdown, text와 machine-readable artifact의 strict byte 검증은 유지하면서 재현 불가능한 PNG byte
비교만 제외하고 PNG rendering regression을 별도 검증하도록 수정했다.

두 번째 exact-tag workflow `33535760778`은 verify 전체와 environment 승인을 통과했지만, dependency를
설치하지 않는 publish checkout에서 verifier가 package 생성 전용 `esbuild`를 정적 import해 artifact
identity 확인 단계에서 중단되었다. 이 실행 역시 npm publish, GitHub Release와 Pages보다 앞에서
중단되었다. Candidate 생성 시에만 package builder를 lazy import하도록 고치고, `node_modules`가 없는
격리 clone에서 tag, commit, release notes와 두 tarball hash를 확인하는 회귀 계약을 추가했다.

최종 verify job이 exact annotated tag에서 만든 하나의 canonical artifact를 publish job이 그대로
재사용한다. `npm-release` environment 승인 이후 npm, GitHub Release와 Pages는 모두 같은 tag commit을
기준으로 생성했다. Final workflow는 verify `1h 10m 48s`, publish `33s`, Pages build `25s`, Pages
deploy `3m 15s`로 모두 성공했다.
