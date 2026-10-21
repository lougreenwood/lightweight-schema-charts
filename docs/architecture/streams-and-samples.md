# Streams and samples

The package charts time series, not a specific asset class. Two shapes matter, and they are not the same.

## Continuous streams

A continuous stream is ordered and dense. Each sample follows the previous one, and new samples are appended at the end. Candles, prices, and rolling indicator values are continuous streams.

Properties:

- A cursor marks the latest consumed point.
- Fetching asks for samples after the cursor.
- Appending is the normal update; replacing the latest sample is the exception when a value mutates in place.
- A gap is a defect, not a feature.

## Discrete event streams

A discrete event stream is ordered but sparse. Events happen at points in time with arbitrary gaps between them: a signal fired, a threshold crossed, an observation recorded.

Properties:

- There is no expectation of contiguity.
- Rendering usually differs: markers, bands, or a separate series rather than a connected line.
- A cursor still identifies progress, but "since the last event" is a range query, not an append.

Discrete event streams are a design direction. The current implementation models samples densely and does not yet ship an event series kind. The contract should not be read as promising one today.

## The sample shape

A sample carries:

| Field | Meaning |
| --- | --- |
| `data` | The consumer's payload for that point |
| `dataStreamIdentifier` | Which stream produced it |
| `dataProviderIdentifier` | Which provider owns the stream |
| `time` | The point in time |
| `window` | The time window the sample covers |
| `meta` | Anything else the consumer needs |

The package never interprets `data`. A presenter's projection turns it into the point shape a series adapter expects.

## Data state

Each stream exposes four plain values to the schema:

| Value | Purpose |
| --- | --- |
| `cursor` | Latest consumed point; absence means nothing fetched yet |
| `dataLength` | Known sample count, when the consumer can supply it |
| `dataHash` | Content fingerprint, when the latest value can mutate in place |
| `projectionId` | Identity of the projection, when the stream can be reconfigured |

These values exist to answer one question during reconciliation: can this series be updated incrementally, or must it be rebuilt? Their absence is meaningful. A stream that cannot supply a hash simply never triggers a content-only update.

## Identity

Group identity is supplied by the provider through `groupIdFor`, not derived by the package. A consumer with stable configuration identity can keep the same group across reconfigurations; a consumer without one can fall back to a stable key and stream type.

Identity is what makes incremental reconciliation safe. If identity changes, the series is rebuilt rather than updated.

## Boundaries

- The package owns ordering, projection, and reconciliation.
- The consumer owns retrieval, caching, persistence, and the meaning of its payloads.
- A presenter may not fetch. A provider may not project into series points.
