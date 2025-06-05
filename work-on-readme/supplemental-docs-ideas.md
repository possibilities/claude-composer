# Supplemental Documentation Ideas

This document contains content removed from the main README that could be used for supplemental documentation.

## Potential Supplemental Docs

### 1. Advanced Configuration Guide

- Detailed configuration file structure
- Environment variable expansion
- Configuration precedence rules
- Custom ruleset/toolset creation

### 2. Rulesets Reference

- Detailed ruleset syntax
- Path pattern examples
- Domain matching patterns
- Ruleset chaining behavior

### 3. Toolsets Reference

- Tool permission model
- MCP server configuration
- Tool merging behavior

### 4. Notifications Guide

- All notification types
- Fine-grained notification controls
- Sticky notification behavior

### 5. Security & Safety Guide

- Safety flags explained
- Version control requirements
- Trust model

## Content Removed from Main README

### From "What is Claude Composer?" section

Key benefits list:

- **Reduced interruptions**: Automatically handles permission dialogs based on configurable rules
- **Enhanced visibility**: System notifications keep you informed without switching contexts
- **Flexible control**: Rulesets let you define exactly which actions to allow automatically
- **Tool management**: Toolsets simplify configuring which tools Claude can use

### From "Installation & Setup" section

#### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm package manager
- Claude Code installed and configured

#### Package manager alternatives

```bash
yarn global add claude-composer
npm install -g claude-composer
```

#### Initial Configuration Details

Global Configuration:

- Configuration location: `~/.claude-composer/config.yaml`
- Interactive prompts for ruleset and toolset selection
- Applies to all Claude Composer invocations unless overridden

Project Configuration:

- Creates `.claude-composer/config.yaml` in current directory
- Takes precedence over global configuration when present
- Ideal for project-specific rules and tool settings

#### Directory Structure

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

Project configuration:

```
your-project/
├── .claude-composer/
│   ├── config.yaml     # Project configuration
│   ├── rulesets/       # Custom project rulesets
│   └── toolsets/       # Custom project toolsets
└── ... (your project files)
```

### From "Basic Usage" section

#### Command Structure

```bash
claude-composer [claude-composer-options] [claude-code-args]
```

#### Common Workflows Examples

Using Configuration Files:

```bash
# Use global configuration
claude-composer

# Use project configuration (if present)
cd your-project
claude-composer

# Override with specific ruleset
claude-composer --ruleset internal:safe
```

Passing Arguments to Claude Code:

```bash
# Pass model selection to Claude Code
claude-composer --model claude-3-opus-20240229

# Combine composer options with Claude Code args
claude-composer --ruleset internal:yolo --model claude-3-opus-20240229
```

Working with Different Rulesets:

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

Additional Examples:

```bash
# Starting a new project
mkdir my-project && cd my-project
claude-composer cc-init --project
claude-composer  # Uses the configuration created by cc-init

# YOLO mode
claude-composer --ruleset internal:yolo

# Safe AF
claude-composer --ruleset internal:safe

# With custom toolsets
claude-composer --toolset internal:core --ruleset internal:cautious
claude-composer --toolset my-tools --ruleset my-workflow
```

### From "Configuration" section

Configuration precedence (highest to lowest):

1. Command-line flags
2. Project configuration (`.claude-composer/config.yaml`)
3. Global configuration (`~/.claude-composer/config.yaml`)
4. Built-in defaults

Configuration File Locations:

- **Global**: `~/.claude-composer/config.yaml`
- **Project**: `.claude-composer/config.yaml`
- **Custom rulesets**: `{config-dir}/rulesets/*.yaml`
- **Custom toolsets**: `{config-dir}/toolsets/*.yaml`

Full configuration example:

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

#### Roots Configuration Details

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

### From "Rulesets" section

#### Creating Custom Rulesets

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

Project-Level Rulesets example:

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

### From "Toolsets" section

#### Creating Custom Toolsets

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

Project-Level Toolsets example:

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

Key concepts:

- **allowed**: List of tools Claude can use (exclusive - only these tools are allowed)
- **disallowed**: List of tools Claude cannot use (Claude can use any tools except these)
- **mcp**: Configure external MCP servers that provide additional tools

When multiple toolsets are loaded, their configurations merge:

- All allowed tools are combined
- All disallowed tools are combined
- MCP configurations from later toolsets override earlier ones

### From "Command Line Options" section

#### Core Options

Configuration:

- `--ruleset <name...>` - Use specified rulesets (can be used multiple times)
- `--toolset <name...>` - Use specified toolsets (can be used multiple times)
- `--ignore-global-config` - Ignore global configuration file

Safety:

- `--dangerously-allow-in-dirty-directory` - Allow running with uncommitted git changes
- `--dangerously-allow-without-version-control` - Allow running outside version control
- `--dangerously-suppress-automatic-acceptance-confirmation` - Skip confirmation prompts

Notifications:

- `--show-notifications` / `--no-show-notifications` - Enable/disable desktop notifications
- `--sticky-notifications` / `--no-sticky-notifications` - Make notifications stay until dismissed
- `--show-work-complete-notifications` / `--no-show-work-complete-notifications` - Show/hide work completion notifications

Debug:

- `--quiet` - Suppress preflight messages
- `--allow-buffer-snapshots` - Enable Ctrl+Shift+S terminal snapshots
- `--log-all-pattern-matches` - Log pattern matches to `~/.claude-composer/logs/`

#### Subcommands

`cc-init` - Initialize a new configuration file:

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

#### Advanced Notification Controls

Fine-tune which notifications appear:

```bash
# Control specific notification types
claude-composer --no-show-edit-file-confirm-notify
claude-composer --show-accepted-confirm-notify
claude-composer --sticky-work-complete-notifications
```
