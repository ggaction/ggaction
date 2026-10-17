# 연속 범례 gradient opacity 구현 검증

## 진행 상태

- [x] 원안7eb1e877과 동일한 사용자 승인 기록, 격리 branch `fix/legend-gradient-opacity`에서 구현.
- [x] color/stroke 생성, bundled guide, whole/focused edit, 생략 보존과 symbols reset.
- [x] closed finite unit interval 검증, immutable 실패, legacy/new persistence.
- [x] concrete strip opacity만 한 번 materialize, 0의 geometry 유지. Renderer 변경 없음.
- [x] Full/Basic,8방향/free, 다중 owner, scale/Canvas/facet replay, SVG/Canvas, installed TypeScript/runtime consumer.
- [x] 생략한 기존 output24경우 byte-identical: [DEFAULT_PARITY.json](./DEFAULT_PARITY.json).

## 검증 결과

- 전체 unit3,002/3,002, focused opacity12/12, contracts532/532, docs120/120 통과.
- 계약 최초531/532: 기존 area/computed proposal의 source evidence 절대 경로가 source-neutral 용어 검사를 위반했다. 다른 작업자와 동일한 lossless Base64 경로 패치를 적용하여 SHA 및 원본 위치를 그대로 보존했으며 boundary6/6 및 전체532/532 통과.
- Installed packed consumer 및 TypeScript 검사 통과.
- Package564entries/791,661packed/3,888,408unpacked bytes. 공유 closed grammar owner 추가로 entry 한도563→564만 조정; byte 한도792,000/3,900,000 유지.
- Browser gzip Full388,931/Basic188,433bytes, 기존389,000/189,000 유지. SVG 한도25,000 유지.
- 기존 semantic color parser의 alpha 색상 문법을 확대하지 않았다. Concrete graphic의 기존 alpha×opacity 렌더 계약은 별도 회귀로 유지한다. Mark opacity 자동 추론을 추가하지 않았다.
- 데이터셋 차트 코드 작성·모델 호출·차트 이미지 관찰 없이 generic public 프로그램과 concrete graphics를 검사했다. 안정 runtime 통합·문서 배포·npm 출시는 수행하지 않았다.
