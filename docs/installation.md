# Installation Guide

Detailed guide for installing and setting up Claude Composer.

## Prerequisites

See [README prerequisites](../readme.md#prerequisites) for requirements.

## Installation Methods

### Global Installation (Recommended)

Global installation makes `claude-composer` available system-wide.

#### Using pnpm (Recommended)

```bash
pnpm add -g claude-composer
```

#### Using npm

```bash
npm install -g claude-composer
```

#### Using yarn

```bash
yarn global add claude-composer
```

### Local Installation

For project-specific installation:

```bash
# In your project directory
pnpm add -D claude-composer

# Run with npx
npx claude-composer
```

### Development Installation

To install from source:

```bash
# Clone repository
git clone https://github.com/your-org/claude-composer.git
cd claude-composer

# Install dependencies
pnpm install

# Build
pnpm build

# Link globally
pnpm link --global
```

## Verifying Installation

After installation, verify Claude Composer is working:

```bash
# Check version
claude-composer --version

# Show help
claude-composer --help
```

## Initial Setup

See [README Initial Configuration](../readme.md#initial-configuration) for setup instructions.

## Platform-Specific Notes

### macOS

- **Notifications**: Grant terminal notification permissions in System Preferences
- **PATH**: Add pnpm/npm/yarn global bin to PATH if needed

### Linux

- **Notifications**: Install `libnotify-bin` (Debian/Ubuntu) or equivalent
- **PATH**: Add global bin directory to shell profile

### Windows

- **Terminal**: Use Windows Terminal or PowerShell
- **Notifications**: Work automatically on Windows 10/11

## Troubleshooting Installation

### Command Not Found

If `claude-composer: command not found`:

1. **Check global bin path**:

   ```bash
   # npm
   npm config get prefix

   # yarn
   yarn global bin

   # pnpm
   pnpm config get global-bin-dir
   ```

2. **Add to PATH**:

   ```bash
   # Example for npm
   export PATH="$(npm config get prefix)/bin:$PATH"
   ```

3. **Reload shell**:
   ```bash
   source ~/.bashrc  # or ~/.zshrc
   ```

### Permission Errors

If you get EACCES errors:

1. **Option 1: Change npm directory** (Recommended):

   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Option 2: Use package manager**:

   ```bash
   # macOS with Homebrew
   brew install node

   # Linux with system package manager
   # Then use pnpm/yarn which handle permissions better
   ```

### Version Conflicts

If you have issues with Node.js version:

1. **Check current version**:

   ```bash
   node --version
   ```

2. **Update Node.js**:

   - Use [nvm](https://github.com/nvm-sh/nvm) (recommended)
   - Or download from [nodejs.org](https://nodejs.org/)

3. **With nvm**:
   ```bash
   nvm install 18
   nvm use 18
   ```

## Upgrading

### Upgrade Global Installation

```bash
# pnpm
pnpm update -g claude-composer

# npm
npm update -g claude-composer

# yarn
yarn global upgrade claude-composer
```

### Check for Updates

```bash
# Check current version
claude-composer --version

# Check latest version
npm view claude-composer version
```

## Uninstalling

### Remove Global Installation

```bash
# pnpm
pnpm remove -g claude-composer

# npm
npm uninstall -g claude-composer

# yarn
yarn global remove claude-composer
```

### Remove Configuration

To completely remove Claude Composer:

```bash
# Remove configuration
rm -rf ~/.claude-composer

# Remove logs
rm -rf ~/.claude-composer-logs
```

### Remove Project Configuration

```bash
# In project directory
rm -rf .claude-composer
```

## Next Steps

After installation, run `claude-composer cc-init` and see the [README](../readme.md) for usage.

## See Also

- [Configuration Guide](./configuration.md) - Setting up configuration
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
- [Troubleshooting Guide](../README.md#troubleshooting) - Common issues
