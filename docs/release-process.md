# Release Process

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- npm publish access
- Clean `main` branch

## Automated Release

```bash
npm run release:patch  # Bug fixes
npm run release:minor  # New features
npm run release:major  # Breaking changes
npm run release        # Default (patch)
```

## Release Steps

The script automatically:

1. **Validates** - Ensures clean main branch
2. **Tests** - Runs test suite and build
3. **Versions** - Bumps version, commits, tags
4. **Publishes** - Pushes to GitHub, publishes npm, creates release

## Manual Process

```bash
git checkout main && git pull
npm test && npm run build
npm version patch
git push origin main --follow-tags
npm publish --access public
gh release create "v$(node -p "require('./package.json').version")" --generate-notes
```

## After Release

1. Review and publish draft GitHub release
2. Update dependent projects

## Troubleshooting

- **npm fails**: Run `npm login`
- **GitHub fails**: Run `gh auth login`
- **Version exists**: Bump version again
