# Partition primitive 시각 검토

상태: **ready-for-review**. 이 문서는 STEP025–028 전체 완료 또는 공개 action의 구현 승인을 기록하지 않는다.

## 진행 상태

- [x] 기존 hierarchy value/identity/interval owner와 private focus/mapping 재사용
- [x] 실행 가능한 명시 primitive chain·14개 manifest·독립 literal reference
- [x] Icicle/Sunburst/focus/residual/zero/forest 및 canonical bend 3개 frame
- [x] Native PNG·Browser Canvas·Browser SVG·vector PDF 출력 및 검증
- [ ] 사용자 시각 확인
- [ ] 일반 screen/direction bend adapter·current-frame hit
- [ ] 공개 resource/action/schema·rematerialization·selection·scene·접근성·전체 consumer 통합

## 검토 대상

실행 원본은 `test/gates/partition-layouts/primitive.program.js`다. `createPartitionPrimitive(id)`는
기존 `chart().createCanvas().createGraphics().editGraphics()`를 명시적으로 연결한다.
`partitionFixture(id)`가 기존 hierarchy 정규화→partition view→rectangle/sector mapping을 호출한 다음
concrete path commands를 만든다. Sunburst의 곡선은 기존 `buildAnnularSectorCommands`를 그대로 사용한다.
새 공개 partition action이나 renderer branch는 추가하지 않았다.

공유 입력·크기·색상·표시 문구·실행 호출은 `test/gates/partition-layouts/manifest.js` 한 곳에 있다.
각 이미지의 `variant.json`에는 정확한 `createPartitionPrimitive("...")` 호출이 저장된다.
전체 chain은 위 실행 원본에서 확인할 수 있다. 향후 공개 호출 chain은 현재 primitive와 같은 결과를 구현해야 한다.

| 표본 | 확인할 의미 |
|---|---|
| icicle / vertical | R10/A6(A1=2,A2=4)/B4의 같은 값·구간을 수평/수직 배치 |
| focus | A를 [0,1]로 확대, A1=1/3·A2=2/3, breadcrumb R 유지 |
| root-hidden | R의 band만 제거, 원 node identity 유지 |
| inclusive | A의 own residual3은 child row의 빈 구간으로 보존; 가짜 child 없음 |
| forest | synthetic root를 숨기고 실제 roots A/B를 같은 깊이에 배치 |
| zero | R/Z metadata를 유지하되 면적을 만들지 않음 |
| sunburst / area-bands | 같은 angular partition, equal-depth / equal-depth-area 반지름 |
| counterclockwise | 3시 방향에서 반시계 방향, static polar 방향 지원 |
| wide-gaps | 각 band의 local mid-radius에서 전체 angular gap12px; radial gap6px |
| bend-0 / bend-half / bend-1 | canonical 좌표에서 b=0/.5/1의 연속 곡률 결과 |

기본 Cartesian gap은 전체2px이며 양면에1px씩 적용한다. 기본 Sunburst는12시에서 시계 방향이고
20–120px 반지름, 전체 angular/radial gap2px다. 이 gap은 normalized interval을 바꾸지 않는다.
0값 node Z는 모든 기본 표본의 metadata에 남지만 면적은 없다.

## Bend 범위

마지막3개 그림은 canonical X/Y를 `(240+X,180+Y)`로 직접 표시한다. Width300/height100,
innerRadius20/outerRadius100, sweep2π의 같은 value cells다. 따라서 일반 Sunburst 표본과 start/direction/size가
같은 endpoint라고 주장하지 않는다. Source-axis convention과 arbitrary screen direction을 맞추는 adapter,
frame hit/clip/padding, reduced motion, unequal radial policy/topology crossfade는 공개 연결 전에 남아 있다.

검토 fixture에서 각 u 경계를 최대128개의 chord로 나누며 node당 최대259 commands, 5개 node에 최대1295 commands다.
b=0은 직선이며 b=.5/1의 독립 circular sagitta bound `radius·deltaAngle²/8`은0.031px 미만이다.
이 polyline은 검토용 bounded approximation이고 일반 path materializer 계약을 대신하지 않는다.

## 출력 및 수치 증거

- Normal3/3: hand-authored cells, focus/zero/residual/synthetic metadata, exact concrete commands/fill,
  독립 direct-circle endpoint 및 chord budget 확인.
- 기존 hierarchy9개 파일68/68 누적 회귀.
- Render1/1: 14개 variant ×4개 출력 경로. 내부 색상324개에서 RGB±1/alpha exact 통과.
- 모든 경로의 plot-region ink 확인. Zero variant는 해당 영역의 ink0을 명시 확인.
- PDF14개 모두 `/Subtype /Image`0개로 vector 유지. SVG와 PDF 원본도 각 variant에 보존.
- Browser readiness·accessible Canvas label·논리 크기480×360·console/page error0 확인.
- Source/discovery/package boundary31/31. Package check692 entries/1,030,205 packed/4,788,507 unpacked bytes로
  직전 kernel checkpoint와 동일. 이번 checkpoint는 runtime/package 입력을 바꾸지 않는다.

첫 실행에서는 literal0.2와 compensated0.19999999999999998의 차이를 exact 비교해 실패했다. Identity/shape는 exact,
수치 oracle은1e-9 tolerance로 분리했다. 초기 renderer의 title textAlign 누락과 variant ID의 decimal 표기도
각각 명시 property와 kebab-case ID로 고쳤다. 초기 로그는 `.artifacts/partition-review/`에 남긴다.

Node/Chromium이 같은 source chain을 계산할 때 polar 삼각함수의 최대 차이는5.684341886080802e-14px다.
계산 결과 비교는 구조/문자열 exact 및 유한 수치1e-10 tolerance로 기록하고, 실제 네 renderer 비교에는
**동일한 concrete graphicSpec**을 전달한다. Runtime 좌표를 반올림하거나 픽셀 tolerance를 확대하지 않았다.
공개 program은 아직 없으므로 primitive/public pixel equality를 완료로 세지 않는다.

## 재현과 산출물

```sh
node scripts/run-tests.js gates capability:partition
node scripts/run-tests.js render gates/partition-layouts
node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js
npm run package:check
```

- Atlas: `.artifacts/test/png/review/partition-layouts/contact-sheet.png`
- Variant: 같은 경로의 `<variant>/primitive.png`, `primitive.svg`, `primitive.pdf`, `browser-canvas.png`, `browser-svg.png`, `pdf.png`
- 기계 판정: `<variant>/evidence.json`와 전체 `results.json`
- 코드·로그·그림 hashes와 exact revision: [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)

Root의 전체 Roadmap9 구현 승인을 재사용하여 이 private review를 준비했다. 이 새 시각 대상의 별도 확인은 아직 없다.
이후 승인된 paint 공개 연결 작업을 우선하며, 현재 partition branch와 검토 증거는 독립적으로 보존한다.
