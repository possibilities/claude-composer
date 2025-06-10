#!/bin/bash

set -e

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Invalid version type. Use patch, minor, or major"
    exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
    echo "Error: Working directory is not clean. Commit or stash changes first."
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Error: Must be on main branch to release. Currently on: $CURRENT_BRANCH"
    exit 1
fi

echo "Pulling latest changes..."
git pull origin main

echo "Running tests..."
npm test

echo "Building project..."
npm run build

echo "Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE -m "Release %s"

NEW_VERSION=$(node -p "require('./package.json').version")

echo "Pushing to git..."
git push origin main --follow-tags

echo "Publishing to npm..."
npm publish --access public

echo "Creating GitHub release..."
gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --generate-notes \
    --draft

echo "✅ Release v$NEW_VERSION completed!"
