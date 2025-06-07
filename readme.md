# Claude Composer

> A tool for enhancing Claude Code with automation, configuration, and UX tweaks

[![Tests](https://github.com/possibilities/claude-composer/actions/workflows/test.yml/badge.svg)](https://github.com/possibilities/claude-composer/actions/workflows/test.yml)

## Features

- **Reduced interruptions**: Auto-handles permission dialogs based on configurable rules
- **Flexible control**: Rulesets define which actions to allow automatically
- **Tool management**: Toolsets configure which tools Claude can use
- **Enhanced visibility**: System notifications keep you informed

## Quick Start

```bash
# Install
npm install -g claude-composer

# Initialize configuration
claude-composer cc-init

# Run with default settings
claude-composer

# Use different rulesets
claude-composer --ruleset internal:yolo  # Accept all prompts
claude-composer --ruleset internal:safe  # Manual confirmation only
```

## Installation

**Prerequisites**: Node.js 18+, npm/yarn/pnpm, Claude Code installed

```bash
# Global install
pnpm add -g claude-composer
# or
yarn global add claude-composer
# or
npm install -g claude-composer
```

## Configuration

Run `claude-composer cc-init` to create configuration:

```bash
# Global config (default)
claude-composer cc-init

# Project-specific config
claude-composer cc-init --project
```

### Basic Configuration

```yaml
# config.yaml
rulesets:
  - internal:cautious
  - my-custom-rules

toolsets:
  - internal:core
  - my-tools

roots:
  - ~/projects/work
  - ~/projects/personal

show_notifications: true
sticky_notifications: false
```

See [docs/configuration.md](docs/configuration.md) for details.

## Rulesets

Control which permission dialogs are automatically accepted.

### Built-in Rulesets

Control which permission dialogs are automatically accepted.

See [docs/rulesets.md](docs/rulesets.md) for complete documentation.

## Toolsets

Configure which tools Claude can use and MCP server connections.

See [docs/toolsets.md](docs/toolsets.md) for details.

## Command Line Options

### Core Options

```bash
# Configuration
--ruleset <name...>              # Use specified rulesets
--toolset <name...>              # Use specified toolsets
--mode <mode>                    # Start in 'act' or 'plan' mode
--ignore-global-config           # Ignore global config

# Safety
--dangerously-allow-in-dirty-directory
--dangerously-allow-without-version-control
--dangerously-suppress-automatic-acceptance-confirmation

# Notifications
--show-notifications / --no-show-notifications
--sticky-notifications / --no-sticky-notifications

# Debug
--quiet                          # Suppress preflight messages
--allow-buffer-snapshots         # Enable Ctrl+Shift+S snapshots
--log-all-pattern-matches        # Log to ~/.claude-composer/logs/
```

### Subcommands

```bash
# Initialize configuration
claude-composer cc-init [options]
  --project                      # Create in current directory
  --use-yolo-ruleset            # Use YOLO ruleset
  --use-cautious-ruleset        # Use cautious ruleset
  --use-safe-ruleset            # Use safe ruleset
  --use-core-toolset            # Enable core toolset
```

All unrecognized options pass through to Claude Code.

See [docs/cli-reference.md](docs/cli-reference.md) for complete reference.

## Environment Variables

See [docs/environment-variables.md](docs/environment-variables.md) for details.

## Trusted roots

Use trusted roots to define trusted parent directories to auto-accept initial trust prompts:

See [docs/roots-config.md](docs/roots-config.md) for details.

## Development

### Release

```bash
npm run release:patch  # Bug fixes
npm run release:minor  # New features
npm run release:major  # Breaking changes
```

See [docs/release-process.md](docs/release-process.md) for details.
