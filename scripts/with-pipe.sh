#!/usr/bin/env bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine the claude-composer command to use
if [ -f "$SCRIPT_DIR/cli.js" ]; then
  # We're in the dist directory, use the local cli.js
  CLAUDE_COMPOSER="node $SCRIPT_DIR/cli.js"
else
  # We're installed globally or in development, use the claude-composer command
  CLAUDE_COMPOSER="claude-composer"
fi

if [ -t 0 ]; then
  exec $CLAUDE_COMPOSER "$@"
else
  input=$(cat)
  
  exec </dev/tty \
    $CLAUDE_COMPOSER "$input" "$@"
fi
