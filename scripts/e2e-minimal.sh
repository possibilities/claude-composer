#!/bin/sh

set -e
set -o verbose

pnpm build

rm -rf /tmp/claude-composer-e2e
mkdir /tmp/claude-composer-e2e
export cli_path=$(pwd)/dist/cli.js
cd /tmp/claude-composer-e2e
touch readme.md
git init
git add .
git commit -m "Let's frikken go"
${cli_path} --dangerously-allow-in-untrusted-root --dangerously-suppress-yolo-confirmation "$(cat <<'EOF'
Perform step by step:
- Create a file called funny-words.txt with a funny word on each line. 5 lines.
- Add another funny word to funny-words.txt
EOF
)"
