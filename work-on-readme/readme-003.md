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
