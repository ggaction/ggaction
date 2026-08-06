# STEP 1 — Resolve Gaps by Behavior Class, Not Test Count

## Resolution policy

각 기존 `Partial`은 다음 중 하나로만 닫는다.

1. 실제로 빠진 값/전환 경계는 direct test를 추가한다.
2. Aggregate가 child action validator를 실행하면 trace와 atomic failure를 executable delegation evidence로 둔다.
3. 같은 branch의 조합 폭만 남은 경우 equivalence class와 bounded pairwise matrix로 닫는다.
4. Arbitrary backend color parsing, unbounded performance stress와 exhaustive Cartesian product처럼 public semantic
   contract가 아닌 범위는 명시적으로 제외한다.

상태 문자열만 바꾸지 않는다. Contract prose는 어떤 evidence나 boundary가 gap을 닫았는지 함께 기록한다.
