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
# Initialize configuration in your project
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

```
pnpm add -g claude-composer
```

Or with other package managers:

````bash
yarn global add claude-composer
```bash

```bash
npm install -g claude-composer
````

### Initial Configuration

Run `cc-init` in your project directory to create the initial configuration:

```bash
cd your-project
cc-init
```

This command will:

- Create a `.claude-composer/` directory in your project
- Generate `claude-composer.yaml` with default settings
- Create empty `rulesets/` and `toolsets/` directories for custom configurations

### Directory Structure

After running `cc-init`, your project will have:

```
your-project/
├── .claude-composer/
│   ├── claude-composer.yaml    # Main configuration file
│   ├── rulesets/              # Custom project rulesets
│   └── toolsets/              # Custom project toolsets
└── ... (your project files)
```
