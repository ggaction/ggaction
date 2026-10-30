# Native guide 공개 연결 검증

승인 근거는 [remainingApproval](../../AUTHORIZATION.json#remainingApproval), 정확한 현재 동작은
[ANIMATION 계약](../../../../contract/current/ANIMATION.md), 범위와 남은 의무는
[GUIDES](../GUIDES.md)가 소유한다. 새로운 승인 질문이나 공개 API를 추가하지 않았다.

`fdc6511d7`의 native guide 계산 기반에 `01ae2001f`의 Geo·partition·Cartesian·polar·D와
appearance version2를 합쳤다. 원 의미값과 namespace/owner/component/label-line key를
optional endpoint vector에 보존한다. 기존 여섯 API와 shared scene renderer를 사용한다.
원 guide action과 immutable trace는 바뀌지 않는다.

- 전체 animation 및 타입 323/323, 변경 8 owner의 coverage 100/95.94/100과 모든 해당
  canonical critical floor가 통과했다. 이후 Basic creation-only 입력 회귀를 포함한 21/21,
  경계·discovery·sharding·타입·interaction 52/52가 통과했다.
- 실제 5 source의 원 단위·행을 보존한 axis/grid/polar 3 recipe씩, canonical runner 5/5가
  통과했다. 실측 시간과 정확 runner receipt를 보존했다.
- PNG/PDF 2개와 Canvas/SVG × DPR1·2 × 두 variant를 검증했다. Canvas resize의 배경은
  기존 weighted raster다. 이를 가이드 vector 경로와 혼동하지 않고, 전체 프레임 픽셀과
  분리한 guide layer의 PDF vector를 각각 검사했다. 실제 PNG/SVG와 원 bytes를 보존한 PDF gzip을 이 폴더에 둔다.
- 같은 `51664ee3…f19ff17` archive를 Node20/22/24에 설치하여 각각 26 runtime 사례,
  strict 타입, 실행 문서 2개, optional peers와 6-entry browser bundle을 검증했다.
  Browser 최초 한도 초과를 보존하고 동일 18개 측정에 새 한도를 재적용해 통과했다.
- 최종 `da8697bb…4bbf7dd` archive는 README의 Basic 한도 숫자만 달라진다. 나머지
  1,164개 tar member는 SHA256가 동일하다. 위 설치/runtime 증거를 명시적으로 재사용하며
  최종 README archive를 다시 설치했다고 주장하지 않는다.
- Package 실측 최댓값 1,165 entries / 1,667,717 packed / 7,533,307 unpacked에 따라
  한도를 1,165 / 1,668,000 / 7,534,000으로 교정했다. Browser Basic 422,412,
  animation 243,697, interaction 131,347 gzip bytes에 각각 422,500 / 243,700 / 131,400
  상한을 적용했다. Full/SVG/graph 한도는 유지했다.
- 문서 최초 232개 중 229개가 통과했다. 새 검색 payload 한도 2건과 generated runtime
  reference stale 1건은 canonical 재생성 후 해당 owner 31/31로 닫았다. 후행 source pin과
  built-site 증거는 `qualification.json`에 별도로 기록한다. `f599ec676` source pin 뒤
  31/31, Jekyll build, 186페이지·1,598 LLM 검증과 desktop search 및 전체 페이지
  320/390/768px 실제 브라우저 검사가 통과했다.

초기 fixture의 잘못된 guide style 옵션, Basic에 없는 editScale 호출, 전체 PDF vector
단정, sampled guide exact/fallback 오염 검증 누락과 최초 package/bundle/doc 실패를 모두
원 로그로 보존했다. 오염 검증은 exact decision이 unavailable guide를 위장하지 못하게
수리했고 전체 animation을 다시 확인했다. 타 family의 supported behavior는 유지했다.
`598d2ccc`의 test-only weighted-shape fixture 및 두 realistic timing 보강도 그대로 반영했다.

이 기록은 native guide의 위 범위만 닫는다. Title·legend·Parallel·reflow·band-boundary guide,
timeline 및 전체 STEP061/062/063/077 완료 증거로 집계하지 않는다.

실행 경로는 `COMMANDS.md`, source hashes는 `source-hashes.json`, 원 결과는 gzip 로그와
`qualification.json`에 있다. 설치 재현 runner는 `installed.mjs.txt`를 작업트리 `.artifacts/`에
복사하고 canonical package artifact JSON을 인자로 전달한다. 설치본에는 runtime source를
복사하거나 private module을 import하지 않는다.
