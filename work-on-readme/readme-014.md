# Claude Composer CLI

> A tool for enhancing Claude Code

## Features

- Automatic dialog dismissal
- System notifications for lifecycle events and dialogs
- Toolsets: Configure tool permissions and MCP servers
- Rulesets: Fine grained control for automatic dialog dismissal

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

### Environment Variables

See [docs/environment-variables.md](docs/environment-variables.md) for available environment variables.

### Roots Configuration

Roots define trusted parent directories where Claude Code's initial trust prompt is automatically accepted:

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

Claude Composer includes three built-in rulesets:

#### `internal:safe`

Maximum security - all dialogs require manual confirmation. No automatic acceptance of any operations.

#### `internal:cautious`

Balanced approach - automatically accepts project-level operations (file edits, creates, bash commands) while requiring confirmation for global operations and web requests.

#### `internal:yolo`

Maximum automation - accepts all operations without confirmation, including global file operations and web requests. Use with caution.

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

Basic ruleset structure:

```yaml
name: my-ruleset
description: Custom ruleset for my workflow

# Project-level permissions
accept_project_edit_file_prompts:
  paths:
    - 'src/**'
    - 'docs/**/*.md'
    - '!**/*.secret'

accept_project_bash_command_prompts:
  paths: # Paths match against the directory where the command is executed
    - 'scripts/**'
    - 'package.json'

# Global permissions
accept_global_bash_command_prompts: false

# Web content permissions
accept_fetch_content_prompts:
  domains:
    - 'github.com'
    - 'docs.*.com'
```

## Toolsets

Toolsets control which tools Claude can use and configure MCP (Model Context Protocol) servers. They provide a flexible way to manage Claude's capabilities on a per-project or global basis.

### What are Toolsets?

Toolsets are YAML files that define:

- Which tools Claude is allowed to use
- Which tools Claude is explicitly blocked from using
- MCP server configurations for additional tool capabilities

### Internal Toolsets

Claude Composer includes one built-in toolset:

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

Basic toolset structure:

```yaml
# Tool permissions
allowed:
  - Tool1
  - Tool2
  - mcp__servername__toolname

disallowed:
  - DangerousTool

# MCP server configuration
mcp:
  servername:
    type: stdio
    command: npx
    args:
      - my-mcp-package
```

Key concepts:

- **allowed**: List of tools Claude can use (exclusive - only these tools are allowed)
- **disallowed**: List of tools Claude cannot use (Claude can use any tools except these)
- **mcp**: Configure external MCP servers that provide additional tools

When multiple toolsets are loaded, their configurations merge:

- All allowed tools are combined
- All disallowed tools are combined
- MCP configurations from later toolsets override earlier ones

## Command Line Options

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

See [docs/notifications-guide.md](docs/notifications-guide.md) for full notification options.
