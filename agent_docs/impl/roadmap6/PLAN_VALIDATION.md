# Roadmap 6 — 계획 패키지 검증 기록

작성일: 2026-09-05. 이 문서는 이번 **로드맵 작성**의 실제 확인 결과만 기록한다.
미래 구현 단계의 통과·사용자 승인·버그 수정 완료를 뜻하지 않는다.

## 변경 범위

- Roadmap 6: 12개 Phase, 47개 작업 묶음, 13개 차트군 계약.
- B01–B08, D01–D20, F01–F20의 48개 항목에 primary 작업과 acceptance를 부여했다.
- 공통 결정 16개, 하위 액션군, compatibility/migration, 검증 matrix, F20 진입 조건을 작성했다.
- 원래 ignored 감사 자료를 repository-native audit/로 보존하고 재현 경로를 수정했다.
- agent_docs의 README, implementation README/history/index를 Roadmap 6 Phase 0에 연결했다.
- Product runtime, types, Current/Planned API 계약, package와 GitHub issue 상태는 변경하지 않았다.

## 실행한 검증

| 검증 | 결과 |
| --- | --- |
| node --test test/contracts/agent-docs-navigation.test.js | 7 passed / 0 failed |
| npm run test:contracts | 255 passed / 0 failed |
| 48개 finding ID 전체 집합·primary owner·related work 대조 | 누락·중복 primary 0 |
| Phase dependency, work package ID, Gate state 점검 | 12 phases, 47 work packages, 모든 Gate planned |
| Roadmap Markdown local route/anchor 검사 | 깨진 링크·anchor 0 |
| Relocated API probe | 43 API + 7 query 관측이 baseline JSON과 byte-identical |
| Relocated MCP template execution | 7개 결과가 baseline JSON과 byte-identical |
| Relocated inventory replay | JSON/CSV byte-identical; 173 direct·284 wrapped·internal 누락16 동일 |
| Strict TypeScript 관측 probe | 기준의 3개 diagnostic 재현, exit 1은 의도된 관측 결과 |
| git diff --check | whitespace 오류 0 |

API·MCP probe의 observed rejection은 현재 오류·제한을 재현한 것이다.
Runtime tests가 모두 통과하거나 B01–B08을 고쳤다는 의미로 세지 않는다.
Type probe는 원래 4개 호출 중 3개 선언 불일치를 기록하며 오류 수를 0으로 꾸미지 않았다.

## Evidence identity

관측 source commit은 cee752b0580e6f31630ad5dd2224ab3b5f5f682b다.
이번 계획은 codex/roadmap6-hierarchical-actions branch에서 보존한다.
계획의 Git commit 자체가 문서 package identity이며, 자기 자신을 가리키는 가상 commit hash를 적지 않는다.

| 보존 파일 | bytes | SHA-256 |
| --- | ---: | --- |
| audit/probe-results.json | 52498 | e22f53db3f15f30296300320dbaa0839866819dc77afaa43ef3ab0914961350a |
| audit/mcp-execution.json | 6275 | a23a09858fd4086453dbb459211d3e81e3ca1079d3aad2fce646a2b3c25fca86 |
| audit/inventory.json | 344473 | e38f3932001de54ad77ae3e1f693f5b771175c67f6cebadf7878e34c9d523b57 |
| audit/inventory.csv | 47967 | b13f1b140aca5974fea0e21fdb45eac9a1d0d73b3e0aea1cc4a22d9a90b18fed |

Internal reconciliation은 replay inventory summary의 direct/registered/internal/missing method 전체와 일치한다.
Type diagnostics는 파일 이동에 따른 path만 정규화하여 비교했다.

## 이번에 실행하지 않은 것

Product behavior와 graphics를 바꾸지 않았으므로 전체 browser/render/realistic/package-release 검증을
로드맵 작성의 완료 조건으로 다시 실행하지 않았다. 미래 구현에 필요한 검증은
[VALIDATION.md](VALIDATION.md)와 각 phase Gate가 소유한다.

Approval은 모두 planned이고 approved가 아니다. 새로운 API 이름은 Proposed다.
PR 생성, merge, release, package publish, docs deploy는 수행하지 않았다.
