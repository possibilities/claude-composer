#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/cli.js" ]; then
  CLAUDE_COMPOSER="node $SCRIPT_DIR/cli.js"
else
  CLAUDE_COMPOSER="claude-composer"
fi

if [ -t 0 ]; then
  exec $CLAUDE_COMPOSER "$@"
else
  input=$(cat; exec 0<&-)
  exec 0</dev/tty
  exec $CLAUDE_COMPOSER "$input" "$@"
fi
