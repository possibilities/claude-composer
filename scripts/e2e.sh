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
date > /tmp/claude-composer-e2e-date1.txt
date > /tmp/claude-composer-e2e-date2.txt
date > /tmp/claude-composer-e2e-date3.txt
${cli_path} --dangerously-allow-in-untrusted-root --dangerously-suppress-yolo-confirmation "$(cat <<'EOF'
Perform step by step:
- Create a file called funny-words.txt with a funny word on each line. 5 lines.
- Run `ls -lsa /tmp | grep e2e-date` in the current directory
- Add a sixth funny word to the file funny-words.txt
- Read this file /tmp/claude-composer-e2e-date1.txt
- Make a funny poem using the funny words in funny-words.txt
- Create a file called funny-poem.txt with the poem in it
- Read these files /tmp/claude-composer-e2e-date2.txt and /tmp/claude-composer-e2e-date3.txt
- Run ls -lsa in the current directory
EOF
)"
