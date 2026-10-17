# 명시적 gradient opacity 승인

- 상태: approved
- 날짜: 2026-10-16
- 검토 revision: 7eb1e877d761f388c6200978f1b02e4e1f57acd9
- 원안: [PROPOSAL.md](./PROPOSAL.md), [issue191](https://github.com/ggaction/ggaction/issues/191)
- 승인 근거: 사용자가 여섯 보류 설계에 응답하여 이 원안을 명시적으로 승인했다. 상위 작업자가 같은 대화에서 “USER APPROVED all six pending answers now” 및 “gradient.opacity exact proposal 7eb1e877 issue191 implementation”을 전달했다. 동일 원안의 승인을 재사용하며 새 승인을 요구하지 않는다.
- 범위: 기본값1, color/stroke ramp body에만 한번 적용, 0의 geometry 보존, mark opacity 및 scale alpha와 독립, 편집 생략 보존, symbols 전환 reset, legacy 호환 및 closed schema 검증.
- 구현: 격리 작업트리 ggaction-legend-gradient-opacity, 기반 d2c1aa8a4b1647c9e27499ee47db7ea1f4961bd6. 안정 runtime/pin 통합은 상위 작업자가 맡는다.
- 배포와 npm 게시, 문서 사이트 배포는 승인 범위가 아니다.
