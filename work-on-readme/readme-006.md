# Claude Composer CLI

> A tool for enhancing Claude Code

## Features

- Automatic dialog dismissal
- System notifications for lifecycle events and dialogs
- Toolsets: Inject tools and allow with predefined set
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
cc-init

# Start Claude Code with automatic dialog dismissal
claude-composer --ruleset internal:cautious

# Use a more permissive ruleset
claude-composer --ruleset internal:yolo
```

## What is Claude Composer?

Claude Composer is a CLI wrapper for Claude Code that adds small enhancements around automation, UX, and configuration.

Key benefits:

- **Reduced interruptions**: Automatically handles permission dialogs based on configurable rules
- **Enhanced visibility**: System notifications keep you informed without switching contexts
- **Flexible control**: Rulesets let you define exactly which actions to allow automatically
- **Tool injection**: Toolsets simplify activating tools and configuring tools permissions

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

Run `cc-init` to create your initial configuration:

```bash
# Create global configuration (default)
cc-init

# Or create project-specific configuration
cc-init --project
```

#### Global Configuration

By default, `cc-init` creates a global configuration that applies to all projects:

- Configuration location: `~/.claude-composer/config.yaml`
- Interactive prompts for ruleset and toolset selection
- Applies to all Claude Composer invocations unless overridden

#### Project Configuration

Use `cc-init --project` to create a project-specific configuration:

- Creates `.claude-composer/config.yaml` in current directory
- Takes precedence over global configuration when present
- Ideal for project-specific rules and tool settings

### Directory Structure

Global configuration:

```
~/.claude-composer/
├── config.yaml          # Global configuration
├── rulesets/           # Custom global rulesets
└── toolsets/           # Custom global toolsets
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
