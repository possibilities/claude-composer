# Claude Composer CLI

> A tool for enhancing Claude Code

## Features

- Automatic dialog dismissal
- System notifications for lifecycle events and dialogs
- Toolsets: Configure tool permissions and MCP servers
- Rulesets: Fine grained control for automatic dialog dismissal

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Basic Usage](#basic-usage)
- [What is Claude Composer?](#what-is-claude-composer)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation-1)
  - [Initial Configuration](#initial-configuration)
  - [Directory Structure](#directory-structure)
- [Basic Usage](#basic-usage-1)
  - [Command Structure](#command-structure)
  - [Common Workflows](#common-workflows)
  - [Examples](#examples)
- [Configuration](#configuration)
  - [Configuration File Locations](#configuration-file-locations)
  - [Basic Configuration Options](#basic-configuration-options)
  - [Environment Variables](#environment-variables)
  - [Roots Configuration](#roots-configuration)
- [Rulesets](#rulesets)
  - [What are Rulesets?](#what-are-rulesets)
  - [Internal Rulesets](#internal-rulesets)
  - [Project-Level Rulesets](#project-level-rulesets)
  - [Using Rulesets](#using-rulesets)
  - [Creating Custom Rulesets](#creating-custom-rulesets)
- [Toolsets](#toolsets)
  - [What are Toolsets?](#what-are-toolsets)
  - [Internal Toolsets](#internal-toolsets)
  - [Project-Level Toolsets](#project-level-toolsets)
  - [Using Toolsets](#using-toolsets)
  - [Creating Custom Toolsets](#creating-custom-toolsets)
- [Command Line Options](#command-line-options)
  - [Core Options](#core-options)
  - [Subcommands](#subcommands)
  - [Pass-through Options](#pass-through-options)
  - [Advanced Notification Controls](#advanced-notification-controls)
- [Development](#development)
  - [Contributing](#contributing)
  - [Release Process](#release-process)

## Quick Start

### Installation

```bash
npm install -g claude-composer
# or
yarn global add claude-composer
# or
pnpm add -g claude-composer
```

### Basic Usage

```bash
# Initialize global configuration
claude-composer cc-init

# Start Claude Code with automatic dialog dismissal
claude-composer  # Uses the ruleset configured during cc-init

# Use a more permissive ruleset
claude-composer --ruleset internal:yolo
```

## What is Claude Composer?

Claude Composer is a CLI wrapper for Claude Code that adds small enhancements around automation, UX, and configuration.

Key benefits:

- **Reduced interruptions**: Automatically handles permission dialogs based on configurable rules
- **Enhanced visibility**: System notifications keep you informed without switching contexts
- **Flexible control**: Rulesets let you define exactly which actions to allow automatically
- **Tool management**: Toolsets simplify configuring which tools Claude can use

## Installation & Setup

See [docs/installation.md](docs/installation.md) for detailed installation instructions.

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm package manager
- Claude Code installed and configured

### Installation

Install Claude Composer globally:

```bash
pnpm add -g claude-composer
```

Or with other package managers:

```bash
yarn global add claude-composer
npm install -g claude-composer
```

### Initial Configuration

Run `claude-composer cc-init` to create your initial configuration:

```bash
# Create global configuration (default)
claude-composer cc-init

# Or create project-specific configuration
claude-composer cc-init --project
```

#### Global Configuration

By default, `claude-composer cc-init` creates a global configuration that applies to all projects:

- Configuration location: `~/.claude-composer/config.yaml`
- Interactive prompts for ruleset and toolset selection
- Applies to all Claude Composer invocations unless overridden

#### Project Configuration

Use `claude-composer cc-init --project` to create a project-specific configuration:

- Creates `.claude-composer/config.yaml` in current directory
- Takes precedence over global configuration when present
- Ideal for project-specific rules and tool settings

### Directory Structure

Global configuration:

```
~/.claude-composer/
├── config.yaml          # Global configuration
├── rulesets/           # Custom global rulesets (unprefixed)
│   ├── my-workflow.yaml
│   └── backend-dev.yaml
└── toolsets/           # Custom global toolsets (unprefixed)
    ├── my-tools.yaml
    └── web-dev.yaml
```

Project configuration (with `--project`):

```
your-project/
├── .claude-composer/
│   ├── config.yaml     # Project configuration
│   ├── rulesets/       # Custom project rulesets
│   └── toolsets/       # Custom project toolsets
└── ... (your project files)
```

## Basic Usage

### Command Structure

```bash
claude-composer [claude-composer-options] [claude-code-args]
```

Claude Composer acts as a wrapper around Claude Code, passing through all supported arguments to Claude Code.

### Common Workflows

#### Using Configuration Files

```bash
# Use global configuration
claude-composer

# Use project configuration (if present)
cd your-project
claude-composer

# Override with specific ruleset
claude-composer --ruleset internal:safe
```

#### Passing Arguments to Claude Code

```bash
# Pass model selection to Claude Code
claude-composer --model claude-3-opus-20240229

# Combine composer options with Claude Code args
claude-composer --ruleset internal:yolo --model claude-3-opus-20240229
```

#### Working with Different Rulesets

```bash
# Safe mode - all dialogs require confirmation
claude-composer --ruleset internal:safe

# Cautious mode - auto-accept project-level operations
claude-composer --ruleset internal:cautious

# YOLO mode - auto-accept all operations
claude-composer --ruleset internal:yolo

# Global custom ruleset (no prefix needed)
claude-composer --ruleset my-workflow

# Project-specific ruleset
claude-composer --ruleset project:my-custom-rules

# Chain multiple rulesets
claude-composer --ruleset internal:safe --ruleset my-overrides
```

### Examples

See [docs/examples.md](docs/examples.md) for more usage examples and advanced workflows.

#### Starting a new project

```bash
mkdir my-project && cd my-project
claude-composer cc-init --project
claude-composer  # Uses the configuration created by cc-init
```

#### YOLO

```bash
# Use YOLO mode if you are truly living in the moment
claude-composer --ruleset internal:yolo
```

#### Safe AF

```bash
# This effectively disables accepting all confirmations
claude-composer --ruleset internal:safe
```

#### With custom toolsets

```bash
# Enable built-in tools
claude-composer --toolset internal:core --ruleset internal:cautious

# Use global custom toolset
claude-composer --toolset my-tools --ruleset my-workflow
```

## Configuration

Claude Composer uses YAML configuration files to define behavior. Configuration is loaded from multiple sources with the following precedence (highest to lowest):

1. Command-line flags
2. Project configuration (`.claude-composer/config.yaml`)
3. Global configuration (`~/.claude-composer/config.yaml`)
4. Built-in defaults

### Configuration File Locations

- **Global**: `~/.claude-composer/config.yaml`
- **Project**: `.claude-composer/config.yaml`
- **Custom rulesets**: `{config-dir}/rulesets/*.yaml`
- **Custom toolsets**: `{config-dir}/toolsets/*.yaml`

### Basic Configuration Options

```yaml
# Rulesets to apply (in order)
rulesets:
  - internal:cautious # Built-in ruleset
  - my-defaults # Global custom ruleset
  - project:custom-rules # Project-specific ruleset

# Toolsets to enable
toolsets:
  - internal:core # Built-in toolset
  - development-tools # Global custom toolset
  - project:my-tools # Project-specific toolset

# Trusted root directories
roots:
  - ~/projects/work
  - ~/projects/personal

# UI preferences
show_notifications: true
sticky_notifications: false
```

See [docs/configuration.md](docs/configuration.md) for comprehensive configuration documentation.

### Environment Variables

Claude Composer supports environment variables for configuration:

- `CLAUDE_COMPOSER_CONFIG_DIR` - Override config directory location
- `CLAUDE_COMPOSER_NO_NOTIFY` - Disable all notifications
- `FORCE_COLOR` - Control color output

See [docs/environment-variables.md](docs/environment-variables.md) for details.

### Roots Configuration

Roots define trusted parent directories where Claude Code's initial trust prompt is automatically accepted. See [docs/roots-config.md](docs/roots-config.md) for detailed configuration options.

```yaml
roots:
  - ~/projects # Trust direct children of ~/projects
  - /tmp/sandbox # Trust direct children of /tmp/sandbox
  - $WORK_DIR/repos # Environment variable expansion supported
```

When you start Claude Composer in a directory whose **parent** is listed in roots:

- The "Do you trust the files in this folder?" prompt is automatically accepted
- The automatic acceptance confirmation prompt is suppressed

**Important**: Only direct children of root directories are trusted. For example, if `~/projects` is a root, then `~/projects/my-app` is trusted, but `~/projects/my-app/src` is not.

## Rulesets

Rulesets control which permission dialogs are automatically accepted or rejected. They provide fine-grained control over Claude Code's interactions with your system.

### What are Rulesets?

Rulesets are YAML files that define:

- Which dialogs to automatically accept or reject
- Path-based rules for file and directory operations
- Pattern-based command filtering
- Domain allowlists for web requests

### Internal Rulesets

Claude Composer includes three built-in rulesets. See [docs/internal-rulesets.md](docs/internal-rulesets.md) for detailed information about each ruleset.

#### `internal:safe`

Maximum security - all dialogs require manual confirmation. No automatic acceptance of any operations.

#### `internal:cautious`

Balanced approach - automatically accepts project-level operations (file edits, creates, bash commands) while requiring confirmation for global operations and web requests.

#### `internal:yolo`

Maximum automation - accepts all operations without confirmation, including global file operations and web requests. Use with caution.

See [docs/rulesets.md](docs/rulesets.md) for detailed ruleset documentation and creating custom rulesets.

### Project-Level Rulesets

Create custom rulesets in your project's `.claude-composer/rulesets/` directory:

```yaml
# .claude-composer/rulesets/backend.yaml
name: backend
description: Rules for backend development

# Accept file operations with path restrictions
accept_project_edit_file_prompts:
  paths:
    - 'src/**/*.js'
    - 'src/**/*.ts'
    - 'test/**'
    - '!**/*.env'

accept_project_bash_command_prompts: true
accept_fetch_content_prompts: false
```

### Using Rulesets

```bash
# Use internal ruleset
claude-composer --ruleset internal:cautious

# Use global custom ruleset (no prefix)
claude-composer --ruleset my-workflow

# Use project ruleset
claude-composer --ruleset project:backend

# Chain multiple rulesets (later rules override earlier)
claude-composer --ruleset internal:cautious --ruleset my-defaults --ruleset project:backend
```

### Creating Custom Rulesets

Custom rulesets allow fine-grained control over automation. See [docs/rulesets.md](docs/rulesets.md) for complete syntax and examples.

## Toolsets

Toolsets control which tools Claude can use and configure MCP (Model Context Protocol) servers. They provide a flexible way to manage Claude's capabilities on a per-project or global basis.

### What are Toolsets?

Toolsets are YAML files that define:

- Which tools Claude is allowed to use
- Which tools Claude is explicitly blocked from using
- MCP server configurations for additional tool capabilities

### Internal Toolsets

Claude Composer includes one built-in toolset. See [docs/internal-toolsets.md](docs/internal-toolsets.md) for detailed information.

#### `internal:core`

Provides access to Context7 documentation tools, allowing Claude to fetch up-to-date library documentation.

### Project-Level Toolsets

Create custom toolsets in your project's `.claude-composer/toolsets/` directory:

```yaml
# .claude-composer/toolsets/dev-tools.yaml
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash

disallowed:
  - WebSearch

mcp:
  my-server:
    type: stdio
    command: node
    args:
      - ./tools/mcp-server.js
```

### Using Toolsets

```bash
# Use internal toolset
claude-composer --toolset internal:core

# Use global custom toolset (no prefix)
claude-composer --toolset my-tools

# Use project toolset
claude-composer --toolset project:dev-tools

# Chain multiple toolsets
claude-composer --toolset internal:core --toolset project:backend-tools
```

### Creating Custom Toolsets

Toolsets control which tools Claude can use and configure MCP servers. See [docs/toolsets.md](docs/toolsets.md) for complete documentation.

## Command Line Options

See [docs/cli-reference.md](docs/cli-reference.md) for complete command line documentation.

### Core Options

#### Configuration

- `--ruleset <name...>` - Use specified rulesets (can be used multiple times)
- `--toolset <name...>` - Use specified toolsets (can be used multiple times)
- `--ignore-global-config` - Ignore global configuration file

#### Safety

- `--dangerously-allow-in-dirty-directory` - Allow running with uncommitted git changes
- `--dangerously-allow-without-version-control` - Allow running outside version control
- `--dangerously-suppress-automatic-acceptance-confirmation` - Skip confirmation prompts

#### Notifications

- `--show-notifications` / `--no-show-notifications` - Enable/disable desktop notifications
- `--sticky-notifications` / `--no-sticky-notifications` - Make notifications stay until dismissed
- `--show-work-complete-notifications` / `--no-show-work-complete-notifications` - Show/hide work completion notifications

#### Debug

- `--quiet` - Suppress preflight messages
- `--allow-buffer-snapshots` - Enable Ctrl+Shift+S terminal snapshots
- `--log-all-pattern-matches` - Log pattern matches to `~/.claude-composer/logs/`

### Subcommands

#### `cc-init`

Initialize a new configuration file:

```bash
# Create global config
claude-composer cc-init

# Create project config
claude-composer cc-init --project

# Specify ruleset during init
claude-composer cc-init --use-cautious-ruleset
```

Options:

- `--project` - Create config in current directory
- `--use-yolo-ruleset` - Use YOLO ruleset
- `--use-cautious-ruleset` - Use cautious ruleset (recommended)
- `--use-safe-ruleset` - Use safe ruleset
- `--use-core-toolset` / `--no-use-core-toolset` - Enable/disable core toolset

### Pass-through Options

All unrecognized options are passed to Claude Code:

```bash
# These go to Claude Code
claude-composer --model claude-3-opus-20240229
claude-composer --print
claude-composer --help  # Shows both claude-composer and claude help
```

### Advanced Notification Controls

Fine-tune which notifications appear:

```bash
# Control specific notification types
claude-composer --no-show-edit-file-confirm-notify
claude-composer --show-accepted-confirm-notify
claude-composer --sticky-work-complete-notifications
```

See [docs/notifications.md](docs/notifications.md) for detailed notification configuration.

## Development

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Release Process

This project uses automated releases via npm and GitHub. See [docs/release-process.md](docs/release-process.md) for detailed release instructions.

Quick release commands:

```bash
npm run release:patch  # Bug fixes (0.1.0 → 0.1.1)
npm run release:minor  # New features (0.1.0 → 0.2.0)
npm run release:major  # Breaking changes (0.1.0 → 1.0.0)
```
