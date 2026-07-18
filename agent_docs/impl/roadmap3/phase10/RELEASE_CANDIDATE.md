# Roadmap 3 Release Candidate

## 진행 상태

- [x] Roadmap 3 Planned inventory zero
- [x] Current contract, exact TypeScript와 package export 동기화
- [x] Normal, render, browser, coverage와 installed-package 검증
- [x] Built documentation과 desktop/mobile 검증
- [x] Release note 초안과 version recommendation
- [x] 사용자 release-candidate 승인 (`0.0.3`)
- [x] Version 변경, tag, GitHub release와 npm publish

## 권고 version

사용자는 2026-07-19 Roadmap 3 release version을 `0.0.3`으로 확정하고 배포를 승인했다. 최초 권고는 큰 public
capability 확장을 나타내는 `0.1.0`이었으나, 현재 experimental patch sequence를 이어가는 사용자 결정을 따른다.
Candidate의 package, lockfile, docs와 changelog version은 `0.0.3`으로 통일한다.

## Release 범위

- Polar point, line/radar와 arc/donut/rose/radial-bar authoring
- Theta/radius axes와 grids, Polar selection/highlight와 Canvas/PNG output
- `hconcat`, `vconcat`, nested immutable snapshots, layout editing과 stable child replacement
- Cartesian `facet`의 derived-data replay, shared/independent scales, outer axes와 compatible shared legends
- Focused mark/guide/composite edits와 domain-level removal
- Horizontal grouped bars, text annotation, rect heatmap과 directional offsets
- Compatible temporal aggregate bar/line shared-position inference
- Cross-feature nested Polar composition과 Cartesian facet integration

## 검증 결과

2026-07-19 기준:

| 검증 | 결과 |
| --- | --- |
| Normal suite | 1,518 passed |
| PNG/render suite | 113 passed |
| Browser suite | 29 passed |
| Coverage | 94.87% lines, 90.09% branches, 98.49% functions; 52 critical floors passed |
| Roadmap galleries | Roadmap 2 77 variants, Roadmap 3 33 variants; exact primitive/public pairs verified |
| Package artifact | 301 entries; package audit passed |
| Installed consumer | Node 20, 22, 24; JS, TypeScript, extension, PNG, Polar, concat와 facet passed |
| Documentation | source 14 passed; Jekyll build, built checks와 desktop/mobile browser checks passed in CI |
| Candidate GitHub CI | `65af228` run `29658901898` passed all jobs |
| Release workflow | run `29659023951`의 verify, protected-environment approval, npm publish와 GitHub release passed |
| Published consumers | Registry package 기준 Node, TypeScript, browser, extension, PNG와 private-export rejection passed |

로컬 `npm run docs:verify`는 source generation과 14개 docs test까지 통과한 뒤 설치되지 않은 Jekyll executable에서
중단됐다. Repository CI는 문서 runtime을 설치한 뒤 동일 commit의 Jekyll build와 browser 검증을 완료했으므로
문서 product 검증은 통과로 분류한다.

## Current limitation

- Polar program은 direct 또는 nested concat child로 지원한다.
- Polar source `facet`은 theta/radius facet scale과 guide resolution이 구현되지 않아 partial state를 만들기 전에
  명확한 validation error를 낸다.
- SVG, animation, interaction runtime과 automatic semantic-to-graphic compilation은 이번 release 범위가 아니다.

## 배포 결과

- Release commit: `65af228e60be979ec265feea03f420c36e7cd477`
- Tag: `v0.0.3`
- GitHub release: <https://github.com/hj-n/ggaction/releases/tag/v0.0.3>
- npm package: <https://www.npmjs.com/package/ggaction/v/0.0.3>
- npm `latest`: `0.0.3`
- Artifact: `ggaction-0.0.3.tgz`, 301 entries, 276,579 packed bytes, 1,293,288 unpacked bytes
- SHA-1: `fec9d3fe2878b133e9bb4a1204649f5c33778682`
- SHA-256: `b0f91246080690d687a6a93605dc494d64a703728c8e85c6b64d1d34758e8afb`
- npm integrity: `sha512-p7ZAei8b+MT8h9HOkeG2FnqxkDdh5nYTQaBSDxd5gEqYyM2hPHumcoVQpi7YyBzAX3MH73hudrTfoUfqyg2DrQ==`

Release workflow가 만든 단일 tarball을 검증과 publish에 함께 사용했다. Published registry package의 SHA-1은
candidate manifest와 일치하며, fresh consumer와 browser consumer smoke test도 통과했다.
