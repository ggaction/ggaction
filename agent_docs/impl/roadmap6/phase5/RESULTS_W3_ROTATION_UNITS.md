# W3 F — 명시적 rotation unit 결과

## 구현

- `grammar/rotation.js`가 legacy numeric rotation과 구조형
  `{ value, unit: "degrees" | "radians" }` 입력을 한 곳에서 검증하고 radians로
  정규화한다. 구조형 입력은 정확히 두 필드만 허용하며 value는 finite여야 한다.
- Text creation/edit의 materialization config와 Cartesian axis-title create/edit가
  이 owner를 공유한다. `createMarkLabels`, `createAnnotation`, complete Cartesian axis
  facade는 기존 하위 action 위임을 통해 같은 계약을 상속한다.
- 기존 숫자의 의미는 바꾸지 않았다. Text와 Cartesian title 숫자는 계속 radians다.
  `encodeAngle`과 Polar component placement의 숫자는 계속 degrees이며 구조형 rotation
  입력을 받지 않는다.
- `RotationUnit`과 `RotationInput`을 root TypeScript surface에서 공개하고 Text·axis
  title option을 같은 타입으로 연결했다. Direct/user-facing action 수는 **198/192**로
  변하지 않는다.

## 검증

- Rotation grammar·Text·Cartesian axis title·public type 집중 검증 **24/24 PASS**.
- 전체 suite 최초 **3020/3021 PASS**에서 새 source file의 package entry ceiling만
  실제 457에 맞지 않음을 확인했다. 상한을 456→457로 조정한 뒤 최종 전체 suite
  **3021/3021 PASS**.
- Coverage **95.57% lines / 92.60% branches / 99.01% functions**, **88 critical
  floors PASS**.
- Docs source **47/47**, build **125 pages**, desktop search 및 모든 페이지의
  320px/390px/768px Chromium 검증 PASS.
- Catalog/navigation/documentation closeout **21/21 PASS**.

## 배포 경계

- [Canonical package evidence](package-rotation-units-results.json): SHA-256
  `f613a4e0c13029d4636c18451b56107050fcfda26630d6a1f647c18b69923501`,
  **457 entries / 518810 packed / 2475147 unpacked bytes**.
- 같은 tgz의 installed Node/runtime/types/MCP/export와 Chromium **1/1 PASS**.
  Full/Basic/SVG gzip은 **258743 / 141268 / 6437 bytes**, modules **404/247/15**다.
- 새 rotation grammar module 때문에 entry cap만 456→457로 조정했다. Packed
  519000B, unpacked 2500000B, Full 259000B, Basic 142000B, SVG 25000B ceiling은
  유지한다.
- 로그: `.artifacts/roadmap6-authoring/rotation-units-{full-test,coverage,docs,closeout,package-consumer,browser-consumer}.log`.

## 남은 범위

W4 theme, W5 fitting, Phase 6–11과 0.0.13 실제 릴리즈는 남아 있다. 이 결과로
W3와 D13/F14의 label/reference/format/rotation 범위를 닫되 Phase 5 전체 완료를
주장하지 않는다.
