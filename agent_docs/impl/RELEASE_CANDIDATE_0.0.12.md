# ggaction 0.0.12 release record

## 진행 상태

- [x] 공개 dependency update, 기능 이슈와 구현 PR 정리
- [x] Package, lockfile, README, docs, machine-readable knowledge와 CDN example을 `0.0.12`로 정렬
- [x] Changelog, generated release notes와 Context7 version metadata 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.12` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` 승인
- [x] npm, GitHub Release, jsDelivr와 GitHub Pages 결과 검증
- [x] Context7 refresh API 요청과 release-to-refresh 자동 연결 검증

## Version 결정

`0.0.11` 이후 quantitative arc의 직접 theta encoding, quantitative error-bar 위치와 grouped
point-and-whisker offset을 구현했다. Facet이 공유 legend를 승격할 때 `left`, `right`, `top`, `bottom`
위치를 보존하고 해당 방향의 layout 공간을 예약하도록 수정했다. Context7용 canonical documentation 범위,
version metadata와 refresh workflow를 추가했고, realistic CI를 일곱 개의 완전하고 서로 겹치지 않는 shard로
분할했다. 기존 pre-1.0 release sequence에 맞춰 다음 version을 `0.0.12`로 정하고 package, lockfile,
README status, docs config, generated LLM bundle, machine-readable knowledge, Quarto CDN example, package contract와
changelog를 같은 version으로 정렬했다.

## Qualification 증거

Final release commit은 `d3c2d79acccdfa5b518d0243a1ab98fd0a460868`이며 annotated `v0.0.12` tag가 이
commit을 가리킨다. Dependency PR `#54`, `#59`, 기능 PR `#58`, `#60`, `#61`과 release preparation
PR `#62`를 required checks 통과 후 merge했다. PR `#62`의 CI run `33737155276`과 exact tag ref에서
실행한 Release workflow `33738230692`가 최종 release를 검증한다.

- 전체 테스트: `2,273/2,273` 통과
- Documentation source test: `47/47` 통과
- Coverage: line `94.93%`, branch `90.79%`, function `98.72%`와 critical floor `71/71` 통과
- Realistic corpus contract: `167/167` 통과; 50개 pinned dataset, 720-chart facade schedule,
  235-chart selection schedule, 734-selection guide/scale schedule와 460-chart statistical facade schedule 검증
- Exact tarball을 설치한 Node, extension, PDF, PNG, SVG, strict TypeScript, browser bundle, tutorial consumer와
  MCP 계약 검증 통과
- Browser package test `53/53`, PNG regression test `137/137`, generated contract/docs drift, Jekyll build와
  320px, 390px, 768px documentation browser 검증 통과
- Canonical package: entry `424`, packed `465,876` bytes, unpacked `2,230,619` bytes

## Release 결과

- Final workflow: `33738230692`, final conclusion `success`, dispatch ref `v0.0.12`
- Canonical tarball SHA-1: `bc18f32bc433e99b1afdeacc494c739900f7102a`
- Canonical tarball SHA-256: `f68759c89e9ef54efd9922b5c99fd349378899139d58ebd742464393a20a7edd`
- npm `ggaction@0.0.12`의 `dist.shasum`과 직접 내려받은 registry tarball의 SHA-256은 canonical
  artifact와 정확히 일치하고 `latest`는 `0.0.12`다. Registry에는 SLSA provenance attestation이
  등록되었다.
- Public registry에서 새로 설치한 `ggaction@0.0.12`으로 27개 package consumer 경로를 실행했다. Full
  bundle은 gzip `227,147` bytes, basic bundle은 gzip `120,099` bytes, SVG entry는 gzip `6,418`
  bytes다.
- GitHub Release [`v0.0.12`](https://github.com/ggaction/ggaction/releases/tag/v0.0.12)는 draft나
  prerelease가 아닌 public release다.
- jsDelivr exact-version package metadata와 ESM source/type entry가 `0.0.12`를 반환한다.
- GitHub Pages는 exact tag에서 빌드되었고 [`/ggaction/`](https://ggaction.github.io/ggaction/)가 HTTP
  `200`으로 응답한다.
- Context7 workflow `33741230073`은 repository secret을 사용해 `/ggaction/ggaction` refresh API의
  `Refresh started successfully` 응답을 받았다.

## Release 실행 경계

PR CI는 realistic corpus를 일곱 shard로 분할해 전체 wall-clock을 약 10분으로 줄이면서 각 test file을
정확히 한 번 실행한다. Exact-tag release gate는 publish 전에 전체 corpus를 단일 실행해 `20m 16s`에
`167/167`을 통과했고, canonical artifact를 한 번만 생성해 이후 publish job이 그대로 재사용했다.
Final workflow의 verify는 `29m 51s`, publish는 `17s`, Pages build는 `34s`, Pages deploy는 `8s`로 모두
성공했다.

GitHub Actions의 `GITHUB_TOKEN`으로 생성한 Release는 재귀 workflow event를 시작하지 않으므로 이번
Context7 갱신은 release 성공 직후 explicit manual dispatch로 실행했다. 이후
`context7-refresh.yml`을 reusable workflow로 노출하고 release workflow의 publish 성공 job에서 직접
호출하도록 연결했으며, repository secret 전달과 호출 순서를 contract test로 고정했다. 사람이 만든
Release의 `published` event와 explicit manual dispatch 경로도 그대로 유지한다.
