# Gate R53-P6-R — Benchmark and MCP Integrity Reset

## Gate state

`approved`

Approval checkpoint: `a1c56b89`

Fair harness checkpoint: `0536c1e4`

Strict oracle checkpoint: `249b27ed`

Approved by the user on 2026-08-07 with the instruction to correct the full MCP and benchmark stack up to, but not including, the next paid call.

## 한눈에 보는 결정

Gate Q까지의 결과는 candidate 개선을 입증하지 못했다. 더 큰 문제는 현재 benchmark가 MCP transport, knowledge content,
model의 자연 제출 여부와 생성 프로그램 correctness를 한 숫자에 섞고 있다는 점이다. Gate R에서는 새 유료 호출을 하지 않고
이 네 층을 분리한다.

```text
production knowledge
  → direct structured adapter (B)
  → local MCP adapter (C; same visible payload)

docs-only control (A)                 docs + MCP product path (D)
          │                                      │
          └──────── retrieval → submission → program oracle ────────┘
```

기존 Gate A~Q의 plan, artifact와 hash는 수정하지 않는다. 그 결과는 historical diagnostic evidence로 보존하며 새 candidate와
통계를 이어 붙이지 않는다.

## 승인된 무과금 범위

### 1. Production MCP decontamination

- Production knowledge에서 evaluator 전용 `submit_program` 지시를 제거한다.
- Search result마다 exact MCP `resourceUri`를 제공한다.
- Top result의 완전한 primary resource를 같은 search response에 포함해 일반적인 단일-recipe task를 한 번의 retrieval로 닫는다.
- MCP server instructions와 tool description은 실제 공개 surface만 설명한다.
- Generated index, package artifact, source/installed MCP parity와 public contract를 함께 갱신한다.

### 2. Fair condition isolation

- A: current documentation only.
- B: structured knowledge only, direct adapter.
- C: B와 model-visible instruction/schema/payload가 같은 structured knowledge를 local MCP transport로 제공.
- D: documentation + local MCP. 실제 권장 product path를 별도 측정한다.
- B와 C는 transport 외 차이를 제거한다. D의 결과를 B/C transport 비교에 섞지 않는다.

### 3. Honest execution accounting

- Search, exact resource read, submission 뒤 실제 repair가 가능하도록 call envelope를 다시 정의한다.
- Natural submission과 evaluator-forced final submission을 분리 기록한다.
- MCP initialize/discovery/search/read를 실제 protocol operation 수로 센다.
- MCP startup과 discovery를 포함한 end-to-end 시간과, model-visible task loop 시간을 각각 기록한다.
- Paid candidate는 repository source가 아니라 exact installed package artifact를 사용한다.
- 동일 평가 batch에서는 MCP session을 재사용하되 task별 model state는 격리한다.

### 4. Strict program oracle

- Legend title, symbol, label baseline과 gap을 실제 geometry로 검증한다.
- Composition은 모든 panel의 ink, slot identity와 inter-panel gap을 검증한다.
- Tick 수, outlier visibility와 R² annotation color/proximity처럼 기존 presence-only 판정을 concrete value/geometry 판정으로 바꾼다.
- Oracle가 관측할 수 없는 requirement는 통과로 간주하지 않고 명시적 unsupported/failure로 기록한다.

### 5. Fresh generalization and paired statistics

- 반복 교정에 사용한 기존 12 heldout task는 tuning/evaluation history로 재분류한다.
- 기존 recipe alias와 exact prompt closure에 의존하지 않는 새 generalization corpus를 만든 뒤 동결한다.
- Retrieval, natural submission, forced-submission correctness를 별도 분모로 보고한다.
- 효율 비교는 A와 candidate가 같은 task/repetition에서 모두 성공한 pair만 사용하고 coverage와 failure cost를 함께 보고한다.
- 반복 run을 독립 task처럼 과장하지 않고 task-level interval/bootstrap을 사용한다.

### 6. Complete unpaid evidence

- Focused contracts, generated-artifact checks, full test suite, package check와 installed MCP smoke를 실행한다.
- Mock provider로 A/B/C/D parity, repair loop, forced submission, timeout, budget와 persistent-session stop behavior를 검증한다.
- Credential을 읽거나 외부 model endpoint를 호출하지 않는다.

## Public contract decisions

Search response의 `resourceUri`와 inline `primaryResource`는 additive public output이다. 기존 search input과 exact read resource URI는
유지한다. Production MCP는 evaluator의 제출 도구를 알지 못하며, evaluator가 자신의 `submit_program` instruction/schema를
소유한다.

이 결정은 MCP boundary와 evaluation ownership을 바꾸므로 implementation과 함께 `SECOND_ARCHITECTURE.md`, source, declarations,
generated references, package checks와 tests를 동기화한다.

## 완료 조건

1. Production MCP payload에 evaluator-only vocabulary가 없다.
2. B/C의 model-visible knowledge surface가 byte-equivalent하고 transport만 다르다.
3. Mocked single-recipe task는 한 번의 knowledge retrieval 뒤 제출할 수 있다.
4. 최대 두 번의 repair가 실제 call budget 안에서 실행 가능하다.
5. MCP operation count와 startup-inclusive latency가 독립 검증된다.
6. 강화된 oracle의 이전 false-positive 예제가 실패하고 valid fixture는 계속 통과한다.
7. 새 corpus와 paired summary는 frozen digest와 task-level uncertainty를 낸다.
8. Full/package/installed-MCP 검증이 통과한다.
9. External model calls / credential reads / spend가 `0 / 0 / $0`이다.

## 다음 승인선

Gate R 완료 뒤 Gate S에서만 exact paid pilot을 제안한다. Gate S에는 model, task subset, repetitions, maximum calls, 예상 비용,
hard cap, early-stop rule과 immutable artifact hashes를 적는다. 사용자의 별도 비용 승인이 있기 전에는 credential을 읽거나 paid
call을 시작하지 않는다.

PR preparation, Ready 전환, merge, package publish, docs deployment와 release도 이 Gate에 포함되지 않는다.

## 근거

- Failed paid retry: [`GATE_Q.md`](./GATE_Q.md)
- Root-cause analysis: [`LAYOUT_SAFE_SMOKE_ANALYSIS.md`](./LAYOUT_SAFE_SMOKE_ANALYSIS.md)
- Historical frozen benchmark: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Current architecture: [`../../../SECOND_ARCHITECTURE.md`](../../../SECOND_ARCHITECTURE.md)
