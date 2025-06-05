# Installation Guide

Detailed guide for installing and setting up Claude Composer.

## Prerequisites

Before installing Claude Composer, ensure you have:

### Required

- **Node.js**: Version 18 or higher

  - Check version: `node --version`
  - Download: [nodejs.org](https://nodejs.org/)

- **Package Manager**: One of:

  - npm (comes with Node.js)
  - yarn: `npm install -g yarn`
  - pnpm: `npm install -g pnpm`

- **Claude Code**: Installed and configured
  - Installation guide: [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
  - Must be accessible in your PATH

### Recommended

- **Git**: For version control safety features

  - Check: `git --version`
  - Download: [git-scm.com](https://git-scm.com/)

- **Terminal**: Modern terminal with:
  - UTF-8 support
  - 256 color support
  - Desktop notification support

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

### Quick Setup

The fastest way to get started:

```bash
# Run interactive setup
claude-composer cc-init
```

This will:

1. Create configuration directory
2. Ask about ruleset preferences
3. Ask about toolset preferences
4. Create initial configuration

### Manual Setup

For more control, create configuration manually:

1. **Create configuration directory**:

   ```bash
   mkdir -p ~/.claude-composer
   ```

2. **Create configuration file**:
   ```bash
   cat > ~/.claude-composer/config.yaml << 'EOF'
   rulesets:
     - internal:cautious
   toolsets:
     - internal:core
   roots: []
   show_notifications: true
   EOF
   ```

### Project Setup

For project-specific configuration:

```bash
# In your project directory
claude-composer cc-init --project
```

This creates `.claude-composer/config.yaml` in your project.

## Platform-Specific Notes

### macOS

1. **Notifications**: Grant terminal notification permissions

   - System Preferences → Notifications → Terminal

2. **PATH**: If command not found after global install:
   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export PATH="$HOME/.local/share/pnpm:$PATH"
   ```

### Linux

1. **Notifications**: Install notification daemon if needed:

   ```bash
   # Ubuntu/Debian
   sudo apt-get install libnotify-bin

   # Fedora
   sudo dnf install libnotify

   # Arch
   sudo pacman -S libnotify
   ```

2. **PATH**: Add to shell profile if needed:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH="$HOME/.npm-global/bin:$PATH"
   ```

### Windows

1. **Terminal**: Use Windows Terminal or PowerShell

   - Windows Terminal recommended for best experience

2. **PATH**: Usually added automatically, but if not:

   - Open System Properties → Environment Variables
   - Add npm/yarn/pnpm global bin to PATH

3. **Notifications**: Windows 10/11 notifications work automatically

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

### Build Errors

If installing from source fails:

1. **Check Node.js version**: Must be 18+
2. **Clear cache**:
   ```bash
   pnpm store prune
   # or
   npm cache clean --force
   ```
3. **Delete node_modules**:
   ```bash
   rm -rf node_modules
   pnpm install
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

### Migration Notes

When upgrading from older versions:

1. **Backup configuration**:

   ```bash
   cp -r ~/.claude-composer ~/.claude-composer.backup
   ```

2. **Review changelog** for breaking changes

3. **Update configuration** if needed

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

After installation:

1. **Run initial setup**: `claude-composer cc-init`
2. **Read quick start**: Return to main README
3. **Explore configuration**: See [Configuration Guide](./configuration.md)
4. **Learn about rulesets**: See [Rulesets Reference](./rulesets.md)
5. **Configure tools**: See [Toolsets Reference](./toolsets.md)

## Getting Help

If you encounter issues:

1. **Check documentation**: Review this guide and related docs
2. **Search issues**: Check GitHub issues
3. **Get support**: Open new issue with:
   - Operating system
   - Node.js version
   - Installation method
   - Error messages
   - Steps to reproduce

## See Also

- [Configuration Guide](./configuration.md) - Setting up configuration
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
- [Troubleshooting Guide](../README.md#troubleshooting) - Common issues
