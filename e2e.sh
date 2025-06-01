#!/bin/sh

set -e

rm -rf /tmp/claude-composer-e2e
mkdir /tmp/claude-composer-e2e
cd /tmp/claude-composer-e2e
touch readme.md
git init
git add .
git commit -m "Let's frikken go"
claude-composer --go-off "$(cat <<'EOF'
Perform step by step:
- Create a file called foo.txt with a funny word on each line. 5 lines.
- Add a sixth funny word to the file foo.txt
- Make a funny poem using the funny words in foo.txt
- Create a file called poem.txt with the poem in it
- Run ls -lsa in the current directory
EOF
)"
