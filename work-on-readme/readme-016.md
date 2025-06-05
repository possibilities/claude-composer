# Claude Composer CLI

> A tool for enhancing Claude Code

## Features

- Automatic dialog dismissal
- System notifications for lifecycle events and dialogs
- Toolsets: Configure tool permissions and MCP servers
- Rulesets: Fine grained control for automatic dialog dismissal

## Quick Start

```bash
# Install
npm install -g claude-composer

# Initialize configuration
claude-composer cc-init

# Start with automatic dialog dismissal
claude-composer

# Use a different ruleset
claude-composer --ruleset internal:yolo
```

## What is Claude Composer?

Claude Composer is a CLI wrapper for Claude Code that adds small enhancements around automation, UX, and configuration.

## Configuration

Claude Composer uses YAML configuration files. Run `claude-composer cc-init` to create your initial configuration.

Configuration can be global (`~/.claude-composer/config.yaml`) or project-specific (`.claude-composer/config.yaml`).

See [docs/configuration.md](docs/configuration.md) for detailed configuration options.

## Rulesets

Rulesets control which permission dialogs are automatically accepted or rejected.

Built-in rulesets:

- `internal:safe` - All dialogs require manual confirmation
- `internal:cautious` - Auto-accepts project operations, confirms global operations
- `internal:yolo` - Accepts all operations automatically

See [docs/rulesets.md](docs/rulesets.md) for creating custom rulesets.

## Toolsets

Toolsets control which tools Claude can use and configure MCP servers.

Built-in toolsets:

- `internal:core` - Provides Context7 documentation tools

See [docs/toolsets.md](docs/toolsets.md) for creating custom toolsets.

## Command Line Options

```bash
# View all options
claude-composer --help

# Common options
claude-composer --ruleset <name>    # Use specific ruleset
claude-composer --toolset <name>    # Use specific toolset
claude-composer --quiet             # Suppress preflight messages
```

All unrecognized options are passed to Claude Code.

## Documentation

- [Configuration Guide](docs/configuration.md)
- [Rulesets Reference](docs/rulesets.md)
- [Toolsets Reference](docs/toolsets.md)
- [Command Line Reference](docs/cli-reference.md)
- [Environment Variables](docs/environment-variables.md)
