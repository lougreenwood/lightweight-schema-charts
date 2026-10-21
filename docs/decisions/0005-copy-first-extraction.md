# Decision 0005: Copy the working implementation first, decouple after

Date: 2026-10-21
Status: accepted

## Context

The chart existed as part of a larger application before it became a package. Extracting it "properly" would have meant designing neutral ports for data access, value conversion, theming, and diagnostics before any of it had run outside its original host.

That work is real, but it is design work with no execution feedback. Every contract would have been invented against a mental model of the application rather than against a running copy.

## Decision

Copy the working implementation into the package, including the private structures it needs, and record every coupling as a removal item. Decompose afterwards, one seam at a time, driven by those items.

Rules that keep the copy honest:

- Duplication is accepted; cross-repository imports are not.
- Every copied coupling is recorded with a removal trigger. An item without a trigger is a permanent choice and must be named as one.
- The neutral core remains the stated intent, not a claim about the current code.
- The public description says what exists. Intent lives in the roadmap.

## Alternatives rejected

- **Design the neutral core first.** Correct as a destination, but it front-loads interface design and defers all behavioural feedback. It also tends to produce contracts that satisfy the design exercise rather than the renderer.
- **Copy without recording the couplings.** Fastest, and it turns temporary duplication into permanent duplication because nobody can tell which parts were meant to change.

## Consequences

- The package currently contains framework-specific code and vendored support. That is expected and documented.
- A neutral core extraction is planned work, not an aspiration, and the removal items are its backlog.
- Consumers should treat the current public surface as provisional; the core extraction will move implementation without necessarily changing the contracts.
- Documentation must keep current behaviour and intended structure clearly separated, because the two differ today.
