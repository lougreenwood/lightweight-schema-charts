# Documentation

This directory holds package documentation. It must remain usable as part of a standalone chart project.

## Structure

| Directory | Purpose |
| --- | --- |
| `architecture/` | Package boundaries, contracts, and runtime flow |
| `decisions/` | Durable package-level decisions and their consequences |

## Rules

- Describe only the chart packages and their consumers.
- Do not link to private repositories, application source, or internal issue trackers.
- Keep examples runnable with synthetic data included in this repository.
- Update documentation in the same commit as the behavior it describes.
- Do not publish this documentation until its own review is complete.
