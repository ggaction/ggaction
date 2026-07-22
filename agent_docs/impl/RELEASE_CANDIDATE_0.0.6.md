# ggaction 0.0.6 release record

## 진행 상태

- [x] Roadmap 4.1 R41-Exit 승인과 closeout
- [x] CI Polar PNG signature의 platform rasterization 편차 수정
- [x] Package, lockfile, README와 docs version을 `0.0.6`으로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.6` tag 생성과 push
- [x] Protected Release workflow dispatch와 `npm-release` 승인
- [x] npm, GitHub Release와 GitHub Pages 결과 검증

## Version 결정

`0.0.5` 이후 Roadmap 4.1의 additive authoring lifecycle과 compatibility completion, documentation discovery
개선과 search base-path 수정이 누적되었다. 기존 pre-1.0 release sequence와 일치하도록 다음 version을 `0.0.6`으로
정하고 package, lockfile, README status, docs config, generated LLM bundle, package contract test와 changelog를 같은
version으로 정렬했다.

## Qualification 증거

Final release commit은 `7a9583534419ee5cbf9d2fdece7cd16b96714bce`이며 `origin/main` CI run
`29942154076`의 package Node 20/22/24, coverage, documentation과 cumulative test job이 모두 통과했다. Annotated
`v0.0.6` tag는 이 commit을 가리킨다.

- 전체 테스트: `1,916/1,916` 통과
- coverage: line `94.72%`, branch `90.10%`, function `98.45%`; critical floor `68/68` 통과
- Browser Canvas: `47/47` 통과
- Node PNG: `124/124` 통과; approved gallery `123`, active review `0`
- 문서: source check `37/37`, 정적 페이지 `111`, 320/390/768px 브라우저 검증 통과
- action catalog와 generated docs drift check, package contents check와 installed consumer 검증 통과
- package boundary: entry `383`, packed `361,639` bytes, unpacked `1,708,987` bytes
- local preflight tarball SHA-256: `0a63378c9e7e5024532d86d26d004766b08e1affac7a4c160ce47e50f9552622`

CI에서 관찰된 두 Polar chart의 ink-bound 차이는 기능이나 concrete pixel contract 변경이 아니라 GitHub runner의
1.5 logical-pixel 이하 rasterization 편차였다. `y`와 `height` tolerance만 `1.5`로 최소 확대했고 exact
primitive/public pixel equality, ink density, expected color와 plot-region 검사는 유지했다.

## Release 결과

- Workflow: `29942705727`, final conclusion `success`
- Canonical workflow artifact: entry `383`, packed `362,679` bytes, unpacked `1,708,987` bytes
- Canonical SHA-1: `26a592b9e1b7e8be735cdc1c2cf41033af4e2ecd`
- Canonical SHA-256: `4e1e644dd38d445c02541a6dc42d39ccc0818c7da22fb79162800b9ad7247c15`
- npm `ggaction@0.0.6`의 `dist.shasum`은 canonical SHA-1과 정확히 일치하며 `latest`는 `0.0.6`이다.
- GitHub Release `v0.0.6`는 draft나 prerelease가 아닌 public release다.
- GitHub Pages는 exact tag에서 빌드되어 `Experimental 0.0.6`과 `/ggaction/` documentation search root를
  제공한다.

Release workflow는 verify `9m 4s`, publish `31s`, Pages build `29s`, Pages deploy `8s`로 모두 성공했다.
`actions/upload-artifact@v4`의 Node 20 deprecation annotation이 있었지만 GitHub가 Node 24로 실행했고 release
결과에는 영향을 주지 않았다.

## Release 실행 경계

Package publish와 documentation deploy는 사용자의 별도 실행 승인 후 수행했다. Verify job이 exact annotated
tag에서 만든 하나의 canonical artifact를 protected publish job이 그대로 재사용했고, npm, GitHub Release와
Pages는 모두 같은 tag commit을 기준으로 생성되었다. 이 기록 commit은 release tag 이후의 내부 문서 변경이며
배포된 package 또는 Pages artifact를 변경하지 않는다.
