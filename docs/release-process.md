# Release Process

This document outlines the release process for claude-composer.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- npm account with publish access to the package
- Clean working directory on the `main` branch

## Release Commands

The project includes automated release scripts that handle the entire process:

```bash
# For bug fixes and small changes
npm run release:patch

# For new features
npm run release:minor

# For breaking changes
npm run release:major

# Default (patch release)
npm run release
```

## What the Release Script Does

1. **Validates the environment**

   - Ensures you're on the `main` branch
   - Checks for a clean working directory
   - Pulls latest changes from origin

2. **Runs quality checks**

   - Executes the test suite
   - Builds the project

3. **Version management**

   - Bumps the version in package.json
   - Creates a git commit with the new version
   - Tags the commit with `v{version}`

4. **Publishing**
   - Pushes commits and tags to GitHub
   - Publishes the package to npm
   - Creates a draft GitHub release with auto-generated notes

## Manual Release Process

If you prefer to release manually:

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull

# 2. Run tests
npm test

# 3. Build the project
npm run build

# 4. Bump version (creates commit and tag)
npm version patch # or minor/major

# 5. Push to GitHub
git push origin main --follow-tags

# 6. Publish to npm
npm publish --access public

# 7. Create GitHub release
gh release create "v$(node -p "require('./package.json').version")" \
  --title "Release v$(node -p "require('./package.json').version")" \
  --generate-notes
```

## After Release

1. Review and publish the draft release on GitHub
2. Announce the release if needed
3. Update any dependent projects

## Troubleshooting

- **npm publish fails**: Ensure you're logged in with `npm login`
- **GitHub release fails**: Ensure `gh` is authenticated with `gh auth login`
- **Version already exists**: The version was already published, bump again
- **Tests fail**: Fix the failing tests before releasing
