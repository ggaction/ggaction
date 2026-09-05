# Roadmap 6 — 감사 기준 증거

이 폴더는 2026-09-05 액션 계층 감사의 고정된 출발 자료다.
기준 source는 [cee752b0580e6f31630ad5dd2224ab3b5f5f682b](https://github.com/ggaction/ggaction/commit/cee752b0580e6f31630ad5dd2224ab3b5f5f682b),
ggaction 0.0.12다. 이 자료는 새 구현의 통과 결과가 아니다.

## 자료

| 파일 | 내용 |
| --- | --- |
| [REPORT.md](REPORT.md) | 원래 한국어 관측·설계 분석과 rationale |
| [ACTION_INVENTORY.md](ACTION_INVENTORY.md) | 직접 액션 173개의 역할과 B/D/F 연결 |
| [inventory.json](inventory.json) | 선언·옵션·current contract permalink가 포함된 전수 데이터 |
| [inventory.csv](inventory.csv) | 비교·검토용 평면 표 |
| [inventory-reconciliation.json](inventory-reconciliation.json) | 284 wrapped / 173 direct / 95 listed internal, 누락16 |
| [probes.mjs](probes.mjs) | 43개 공개 API 사례와 7개 MCP query |
| [probe-results.json](probe-results.json) | 50개 관측 원본 |
| [probe-summary.txt](probe-summary.txt) | 간단 로그, 긴 결과는 원본 JSON 참고 |
| [mcp-execution.mjs](mcp-execution.mjs) | 검토한 repository template를 synthetic data로 실행 |
| [mcp-execution.json](mcp-execution.json) | 7개 query-generated chart의 실제 layer/item 결과 |
| [type-probes.ts](type-probes.ts) | positive/negative 경계를 대조한 4개 호출 |
| [type-results.txt](type-results.txt) | 기준 TypeScript의 3개 diagnostic |
| [build-inventory.mjs](build-inventory.mjs) | 현재 checkout의 등록·declaration·card·contract 재대조 |

## 재현

Repository root에서 설치된 dependencies로 실행한다. 새 worktree 또는 checkout이 필요하면 이 저장소 내부에
격리하고 기준 commit을 사용한다. 다른 프로젝트 디렉터리를 읽을 필요가 없다.

~~~sh
node agent_docs/impl/roadmap6/audit/probes.mjs
node agent_docs/impl/roadmap6/audit/mcp-execution.mjs
node agent_docs/impl/roadmap6/audit/build-inventory.mjs
./node_modules/.bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --skipLibCheck --ignoreConfig agent_docs/impl/roadmap6/audit/type-probes.ts
~~~

재실행의 JSON/전수표는 .artifacts/roadmap6-audit-replay/에 쓰며 이 폴더의 baseline 결과를 덮어쓰지 않는다.
MCP probe는 repository가 제공하는 local reviewed templates를 local synthetic data로 실행한다.
외부 모델 호출·데이터 전송·비용 발생은 없다.

TypeScript 명령은 기준 상태에서 3개 진단과 nonzero exit를 내는 관측 probe다.
이를 실패한 로드맵 작성 검증이나 이미 수정된 regression suite로 해석하지 않는다.
미래 수정 뒤에는 기대 결과가 달라지므로 baseline 파일을 덮어쓰지 말고 delta를 별도 기록한다.

## 사본의 변경과 한계

원래 ignored 감사 폴더를 저장소 내구 기록으로 옮겼다. Markdown의 repository 상대 경로와 재현 명령을 갱신했고,
scripts는 새 위치의 source imports와 ignored output 경로를 사용하도록 수정했다.
관측 JSON·CSV·diagnostic의 내용은 원래 감사 그대로다. Runtime/types/Current 계약은 이 보존 작업에서 변경하지 않았다.

173개 액션 모두의 계약을 대조했지만 모든 데이터·입력 조합을 실행하지 않았다.
전수표의 여러 B/D 참조는 해당 family의 설계 검토 관련성을 뜻하며, 그 행의 모든 액션에 같은 버그가 있다는 뜻은 아니다.
Module function hconcat/vconcat은 별도 검토했고, 메서드173 집계의 누락으로 세지 않았다.

Historical evidence는 구현의 source dependency가 아니다. 수정 시 필요한 regression assertions는 test/의
capability owner로 옮기고, 제품이나 영구 테스트가 이 roadmap 폴더를 import하지 않도록 한다.
