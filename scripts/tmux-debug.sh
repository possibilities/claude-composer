#!/bin/bash

PANE_ID=$(tmux list-panes -F '#{pane_id}:#{pane_title}' | grep ':claude-composer-debug$' | cut -d: -f1)

if [ -z "$PANE_ID" ]; then
    PANE_ID=$(tmux split-window -h -P -F '#{pane_id}')
    tmux select-pane -t "$PANE_ID" -T "claude-composer-debug"
fi

tmux send-keys -t "$PANE_ID" "pnpm build && echo Listen | pnpm node ./dist/cli.js" Enter
sleep 2
tmux send-keys -t "$PANE_ID" "y" Enter
sleep 1
tmux send-keys -t "$PANE_ID" "y" Enter
