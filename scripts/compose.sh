#!/bin/sh
set -eu

if command -v podman >/dev/null 2>&1; then
  exec podman compose "$@"
fi

exec docker compose "$@"
