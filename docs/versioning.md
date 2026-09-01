---
layout: default
title: Versioning and Documentation Provenance
---

# Versioning and Documentation Provenance

ggaction is experimental and remains below 1.0. Minor releases can change
public action signatures, inference rules, generated graphics, or renderer
behavior. Pin the package version for reproducible authoring and review the
[changelog](https://github.com/ggaction/ggaction/blob/main/CHANGELOG.md) before
upgrading.

## Know which contract you are reading

The documentation badge and generated LLM artifacts identify the package
metadata version in the checked-out source. A repository branch can contain
unreleased changes after that version. The published npm tarball is the
contract for an installed release; the repository `main` branch is the
contract under development.

Use these sources in order for generated code:

1. The installed `types/program.d.ts` and renderer declarations for exact
   syntax and option types.
2. The installed compact action cards and task-packet schema for the local MCP
   contract.
3. Documentation from the same tag or package version for behavior, defaults,
   inference, and examples.
4. `main` documentation only when intentionally targeting unreleased source.

The full LLM bundle begins with a package metadata version and source-status
warning. `llms-manifest.json` records the canonical route, source file, byte
length, and SHA-256 hash of every bundled section. This identifies content
drift without pretending that a branch build is an npm release.

## Confirm an installation

Run the check from the consuming project:

```bash
npm ls ggaction --depth=0
node --version
```

For MCP clients, point at that project's absolute
`node_modules/.bin/ggaction-mcp` path. `npx --no-install ggaction-mcp` prevents
an accidental network-selected version from replacing the installed one.

## Upgrade checklist

1. Read every changelog entry between the pinned and target versions.
2. Regenerate lockfiles and inspect the exact native renderer dependency.
3. Type-check all direct action calls against the target declarations.
4. Run representative browser, SVG, PNG, and PDF consumers used by the
   product; do not rely on one renderer as evidence for all outputs.
5. Compare semantic intent and rendered evidence for charts whose inference,
   guides, transforms, or text layout could change.
6. Restart MCP clients so they load the target package's cards, taxonomy,
   resolver, and schema together.

Do not combine a resolver or generated card catalog from one version with
runtime code from another. Schema versions protect the JSON shape; they do not
make different package behavior interchangeable.

## Related

[Compatibility](./compatibility.md) · [Local MCP](./mcp.md) ·
[Exact TypeScript contract](./reference/types.md) · [Errors and recovery](./errors-and-recovery.md)
