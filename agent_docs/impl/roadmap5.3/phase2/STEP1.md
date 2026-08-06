# STEP 1 — Author and Validate 173 Action Records

## 진행 상태

- [x] Exact action/domain/layer/lifecycle and existing-example inventory
- [x] Narrative source and generated output ownership
- [x] Example schema correction and signature parser repair
- [x] Knowledge loader, validator, generator and deterministic hashes
- [x] Domain source bootstrap from canonical contracts/docs
- [x] Family-level review of summary, use/avoid, state, effects, errors and relations
- [x] Parameter-note path validation against exact action option types
- [x] Existing and focused executable example validation
- [x] Public JSON/router generation and docs synchronization
- [x] Focused, docs, contract and package-boundary verification
- [x] R53-P2-A Gate package commit/push

## 품질 기준

1. Every current action appears exactly once and in the matching domain file.
2. Summary states the concrete chart/result and useful selection context; name-only restatement is rejected.
3. `useWhen` and `avoidWhen` distinguish the action from a nearby alternative or invalid lifecycle state.
4. `requiredState` names real preconditions without inventing implicit first-resource selection.
5. `parameterNotes` describe decision-driving option paths; exact required/optional shape remains generated from types.
6. Semantic/graphic effects respect the current contract and immutable program boundary.
7. Related actions, recipe IDs, docs and example exports resolve in both directions where applicable.
8. Generated action records are stable-sorted and byte-reproducible.

## Explicit non-goals

- Structured recipe authoring and final recipe classification
- Retrieval ranking/API and local MCP implementation
- Package `files`, `bin`, dependency or architecture boundary changes
- Public chart API, action behavior, persisted chart state or renderer changes
- B/C external or paid LLM runs
