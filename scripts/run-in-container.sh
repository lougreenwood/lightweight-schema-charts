#!/bin/sh
set -eu

if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
  exec "$@"
fi

tty_flag="-T"
if [ "${CONTAINER_TTY:-0}" = "1" ]; then
  tty_flag="-it"
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$script_dir/compose.sh" run --rm --no-deps "$tty_flag" dev "$@"
