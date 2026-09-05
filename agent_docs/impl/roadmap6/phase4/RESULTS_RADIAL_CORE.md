# Phase 4 W3 — Measured radius 하위 계산 기반

[전체 승인](../APPROVAL.md)에 따라 Rose/Radial의 공통 계산과 extension primitive 경로를 구현했다. 공개 `encodeR` 옵션과 chart facade, V2 시각 쌍은 아직 미완료다.

- 의미 상태: radius aggregate(count/sum), scale radialMapping(area/radius-length). Count에 가상 field나 행을 만들지 않는다.
- 범주별 합산·원본 row index를 보존한다. 0 범주는 domain/legend에 남고 sector만 생략한다. 음수·비유한·전부 0·합산 overflow·범주 내 서로 다른 색은 오류다.
- Rose는 구멍을 제외한 면적, Radial bar는 구멍부터의 반지름 길이에 비례한다. Mark와 axis/grid는 동일 mapper를 쓴다.
- Domain은 [0,U]이며 모든 aggregate를 포함해야 한다. Linear/zero 기반, nice·reverse 금지, equal-angle categorical band 및 padAngle 0을 검증한다.
- Auto range는 Canvas와 Arc innerRadius를 따른다. Explicit range와 명시된 innerRadius는 일치해야 한다. 명시 여부는 mark config의 private provenance로 구분한다.
- 반지름 제곱 overflow를 피하도록 정규화하며, 부동소수점 반올림을 범위 내로 제한한다. 양수가 두께 0으로 사라질 정도의 정밀도 손실은 명시적으로 거부한다.

검증: `npm test` 최종 2,671/2,671, fail/skip/cancel 0. 새 grammar 6개와 primitive action 4개는 literal geometry, 보존·단조성·극단 범위, source provenance, guide 단위, Canvas/scale/Arc 편집과 immutable 실패를 검증한다. 기존 Polar guide/encoding 집중 검사도 38/38 통과 후 정밀도 test를 추가했다.

로그: `.artifacts/roadmap6-authoring/measured-radius-core-normal-final.log`, `measured-radius-focused.log`.
이번 checkpoint는 하위 계산 기반이다. 새로운 공개 facade, package artifact, V2 PNG/SVG/PDF·browser parity를 통과했다고 주장하지 않는다. 이 증거는 다음 구현에서 작성한다.
