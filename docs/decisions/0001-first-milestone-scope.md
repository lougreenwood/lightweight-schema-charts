# Decision 0001: First milestone is the Ember integration path

Date: 2026-10-19
Status: accepted

## Context

The repository needs a reviewable working chart implementation before investing in package polish or a documentation site.

## Decision

The first milestone covers the minimum path needed to render and update a chart through the Ember package:

- Neutral core contracts and reconciliation.
- Series adapters and explicit theme inputs.
- Ember binding and lifecycle ownership.
- Deterministic synthetic data.
- One runtime test proving mount, update, and destruction.
- A host application consuming the package by name.

The milestone excludes a documentation website, publication, comprehensive tests, stable API review, and release automation.

## Consequences

- The core is proven transitively through the Ember integration, not independently in a browser-only harness.
- The initial package API may change after the first integration.
- Lifecycle correctness is verified for one real path before broader coverage is added.
- A standalone core proof and full test suite are required before any framework-neutral claim is published.
