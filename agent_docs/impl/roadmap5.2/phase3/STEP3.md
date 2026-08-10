# STEP 3 — Make Complete Coverage Mechanically Durable

`ACTION_INDEX.json`은 모든 173개 current action의 contract/effects/tests coverage를 `complete`로 기록한다. Generated
catalog는 이 inventory에서 다시 만든다.

Stable action-contract test는 다음을 강제한다.

- 모든 current action coverage triplet이 `complete`다.
- Current contract corpus에 `⚠️ Partial` 또는 `❌ Missing`이 없다.
- 기존 evidence path validation과 generated catalog freshness가 계속 통과한다.

새 public behavior, declaration, renderer output 또는 package boundary는 추가하지 않는다.
