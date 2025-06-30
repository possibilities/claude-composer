# Claude Composer

> A tool that adds small enhancements to Claude Code

[![Tests](https://github.com/possibilities/claude-composer/actions/workflows/test.yml/badge.svg)](https://github.com/possibilities/claude-composer/actions/workflows/test.yml)

## Features

- **Reduced interruptions**: Automatic confirmation prompt acceptance
- **Tool management**: Toolsets configure which tools Claude can use
- **Enhanced visibility**: System notifications keep you informed (BROKEN, WILL GET BIG UPDATE SOON)

## Quick Start

```bash
# Install
npm install -g claude-composer

# Initialize configuration
claude-composer cc-init

# Run with default settings
claude-composer

# Use YOLO mode (accept all prompts)
claude-composer --yolo
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

## Command Line Options

### Core Options

```bash
# Configuration
--yolo                           # Accept all prompts automatically
--toolset <name...>              # Use specified toolsets
--mode <mode>                    # Start in 'act' or 'plan' mode
--ignore-global-config           # Ignore global config

# Safety
--dangerously-allow-in-dirty-directory
--dangerously-allow-without-version-control
--dangerously-suppress-yolo-confirmation

# Notifications
--show-notifications / --no-show-notifications
--sticky-notifications / --no-sticky-notifications

# Debug
--quiet                          # Suppress preflight messages
--allow-buffer-snapshots         # Enable Ctrl+Shift+S snapshots
--log-all-pattern-matches        # Log to ~/.claude-composer/logs/
```

All unrecognized options pass through to Claude Code.

See [docs/cli-reference.md](docs/cli-reference.md) for complete reference.

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
yolo: false # Set to true to accept all prompts

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

## YOLO Mode

When enabled with `--yolo` flag or `yolo: true` in config, Claude Composer will automatically accept all prompts without confirmation. Use with caution!

## Toolsets

Configure which tools Claude can use and MCP server connections.

See [docs/toolsets.md](docs/toolsets.md) for details.

## Trusted roots

Use trusted roots to define trusted parent directories to auto-accept initial trust prompts.

See [docs/roots-config.md](docs/roots-config.md) for details.

## Environment Variables

See [docs/environment-variables.md](docs/environment-variables.md) for details.

## License

This project is in the public domain. See the [UNLICENSE](UNLICENSE) file for details.
