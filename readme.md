# Claude Composer CLI

> A tool for enhancing Claude Code with automation, configuration, and better UX

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

### Configuration Structure

```
~/.claude-composer/          # Global
├── config.yaml
├── rulesets/*.yaml         # Custom rulesets
└── toolsets/*.yaml         # Custom toolsets

.claude-composer/           # Project-specific
├── config.yaml
├── rulesets/*.yaml
└── toolsets/*.yaml
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

- **`internal:safe`**: All dialogs require manual confirmation
- **`internal:cautious`**: Auto-accepts project operations, confirms global ones
- **`internal:yolo`**: Accepts all operations without confirmation

### Using Rulesets

```bash
# Built-in
claude-composer --ruleset internal:cautious

# Custom global
claude-composer --ruleset my-workflow

# Project-specific
claude-composer --ruleset project:backend

# Chain multiple
claude-composer --ruleset internal:cautious --ruleset my-overrides
```

### Custom Ruleset Example

```yaml
# .claude-composer/rulesets/backend.yaml
name: backend
description: Backend development rules

accept_project_edit_file_prompts:
  paths:
    - 'src/**/*.js'
    - 'test/**'
    - '!**/*.env'

accept_project_bash_command_prompts: true
accept_fetch_content_prompts: false
```

See [docs/rulesets.md](docs/rulesets.md) for complete documentation.

## Toolsets

Configure which tools Claude can use and MCP server connections.

### Built-in Toolsets

- **`internal:core`**: Provides Context7 documentation tools

### Using Toolsets

```bash
# Built-in
claude-composer --toolset internal:core

# Custom
claude-composer --toolset my-tools

# Multiple
claude-composer --toolset internal:core --toolset project:dev-tools
```

### Custom Toolset Example

```yaml
# .claude-composer/toolsets/dev-tools.yaml
allowed:
  - Read
  - Write
  - Edit
  - Bash

disallowed:
  - WebSearch

mcp:
  my-server:
    type: stdio
    command: node
    args: [./tools/mcp-server.js]
```

See [docs/toolsets.md](docs/toolsets.md) for details.

## Command Line Options

### Core Options

```bash
# Configuration
--ruleset <name...>              # Use specified rulesets
--toolset <name...>              # Use specified toolsets
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

- `CLAUDE_COMPOSER_CONFIG_DIR` - Override config directory
- `CLAUDE_COMPOSER_NO_NOTIFY` - Disable notifications
- `FORCE_COLOR` - Control color output

See [docs/environment-variables.md](docs/environment-variables.md) for details.

## Roots Configuration

Define trusted parent directories to auto-accept initial trust prompts:

```yaml
roots:
  - ~/projects # Trusts ~/projects/my-app, not ~/projects/my-app/src
  - $WORK_DIR/repos # Environment variable expansion supported
```

See [docs/roots-config.md](docs/roots-config.md) for details.

## Development

### Release

```bash
npm run release:patch  # Bug fixes
npm run release:minor  # New features
npm run release:major  # Breaking changes
```

See [docs/release-process.md](docs/release-process.md) for details.
