#!/usr/bin/env bash

if [ -t 0 ]; then
  exec claude-composer "$@"
else
  input=$(cat)
  
  exec </dev/tty \
    claude-composer "$input" "$@"
fi
