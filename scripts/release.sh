#!/bin/bash

# Release script for claude-composer
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Invalid version type. Use patch, minor, or major"
    exit 1
fi

# Check if working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    echo "Error: Working directory is not clean. Commit or stash changes first."
    exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Error: Must be on main branch to release. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Run tests
echo "Running tests..."
npm test

# Build the project
echo "Building project..."
npm run build

# Bump version
echo "Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE -m "Release %s"

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Push to git with tags
echo "Pushing to git..."
git push origin main --follow-tags

# Publish to npm
echo "Publishing to npm..."
npm publish --access public

# Create GitHub release
echo "Creating GitHub release..."
gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --generate-notes \
    --draft

echo "✅ Release v$NEW_VERSION completed!"
echo ""
echo "Next steps:"
echo "1. Review and publish the draft release on GitHub"
echo "2. Update any documentation if needed"