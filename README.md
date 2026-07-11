# ggaction

`ggaction` is a JavaScript library for representing chart authoring as immutable,
traceable actions.

The repository is currently implementing
[STEP 1](./agent_docs/impl/STEP1.md). Immutable chart programs and hierarchical
action tracing are available. The primitive actions and Canvas renderer are not
implemented yet.

```javascript
import { chart } from "ggaction";

const program = chart();
```

## Development

```bash
npm test
```

## Documentation

- [Documentation home](./docs/index.md)
- [Core concepts](./docs/core-concepts.md)
