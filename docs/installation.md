# Installation Guide

## Prerequisites

See [README prerequisites](../readme.md#prerequisites) for requirements.

## Installation

### Global Installation (Recommended)

```bash
# pnpm (recommended)
pnpm add -g claude-composer

# npm
npm install -g claude-composer

# yarn
yarn global add claude-composer
```

### Local Installation

```bash
pnpm add -D claude-composer
npx claude-composer
```

## Verification

```bash
claude-composer --version
claude-composer --help
```

## Platform Notes

- **macOS**: Grant notification permissions in System Preferences
- **Linux**: Install `libnotify-bin` (Debian/Ubuntu) or equivalent
- **Windows**: Use Windows Terminal or PowerShell

## Troubleshooting

### Command Not Found

1. Check global bin path:

   ```bash
   pnpm config get global-bin-dir
   ```

2. Add to PATH:
   ```bash
   export PATH="$(pnpm config get global-bin-dir):$PATH"
   ```

### Permission Errors

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Node.js Version

Requires Node.js 18+. Use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 18
nvm use 18
```

## Upgrading

```bash
pnpm update -g claude-composer
```

## Uninstalling

```bash
pnpm remove -g claude-composer
rm -rf ~/.claude-composer
```

## Next Steps

Run `claude-composer cc-init` and see the [README](../readme.md) for usage.

## See Also

- [Configuration Guide](./configuration.md)
- [CLI Reference](./cli-reference.md)
- [Examples](./examples.md)
