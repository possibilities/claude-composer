# CLI Reference

Complete reference for Claude Composer command-line options and usage.

## Synopsis

```bash
claude-composer [options] [claude-code-args]
```

Claude Composer acts as a wrapper around Claude Code, enhancing it with automation features while passing through all Claude Code arguments.

## Options

### Configuration Options

#### `--ruleset <name...>`

Specify rulesets to use. Can be used multiple times.

```bash
# Single ruleset
claude-composer --ruleset internal:cautious

# Multiple rulesets (later overrides earlier)
claude-composer --ruleset internal:safe --ruleset my-overrides

# Mix internal and custom
claude-composer --ruleset internal:cautious --ruleset project:custom
```

**Ruleset prefixes:**

- `internal:` - Built-in rulesets (safe, cautious, yolo)
- `project:` - Project-specific rulesets from `.claude-composer/rulesets/`
- No prefix - Global rulesets from `~/.claude-composer/rulesets/`

#### `--toolset <name...>`

Specify toolsets to use. Can be used multiple times.

```bash
# Single toolset
claude-composer --toolset internal:core

# Multiple toolsets (merge together)
claude-composer --toolset internal:core --toolset my-tools

# Project toolset
claude-composer --toolset project:api-tools
```

**Toolset prefixes:**

- `internal:` - Built-in toolsets (core)
- `project:` - Project-specific toolsets from `.claude-composer/toolsets/`
- No prefix - Global toolsets from `~/.claude-composer/toolsets/`

#### `--ignore-global-config`

Ignore global configuration file (`~/.claude-composer/config.yaml`).

```bash
# Use only project config and CLI flags
claude-composer --ignore-global-config
```

### Safety Options

⚠️ **Warning**: These options bypass important safety checks. Use with caution.

#### `--dangerously-allow-in-dirty-directory`

Allow running with uncommitted git changes.

```bash
# Override git dirty check
claude-composer --dangerously-allow-in-dirty-directory
```

**Default behavior**: Claude Composer warns when running in a directory with uncommitted changes.

#### `--dangerously-allow-without-version-control`

Allow running outside version control.

```bash
# Run without git repository
claude-composer --dangerously-allow-without-version-control
```

**Default behavior**: Claude Composer warns when running outside a git repository.

#### `--dangerously-suppress-automatic-acceptance-confirmation`

Skip confirmation prompts for automatic acceptances.

```bash
# No confirmations for auto-accepted operations
claude-composer --dangerously-suppress-automatic-acceptance-confirmation
```

**Default behavior**: Shows brief confirmation when automatically accepting dialogs.

### Notification Options

#### `--show-notifications` / `--no-show-notifications`

Enable or disable desktop notifications.

```bash
# Enable notifications
claude-composer --show-notifications

# Disable notifications
claude-composer --no-show-notifications
```

#### `--sticky-notifications` / `--no-sticky-notifications`

Control whether notifications stay visible until dismissed.

```bash
# Notifications stay visible
claude-composer --sticky-notifications

# Notifications auto-dismiss
claude-composer --no-sticky-notifications
```

#### `--show-work-complete-notifications` / `--no-show-work-complete-notifications`

Control work completion notifications.

```bash
# Show when work completes
claude-composer --show-work-complete-notifications

# Hide work completion
claude-composer --no-show-work-complete-notifications
```

### Fine-grained Notification Controls

Control specific notification types:

```bash
# Dialog confirmations
--show-edit-file-confirm-notify
--no-show-edit-file-confirm-notify

# Accepted confirmations
--show-accepted-confirm-notify
--no-show-accepted-confirm-notify

# Sticky controls per type
--sticky-edit-file-confirm-notifications
--sticky-accepted-confirm-notifications
--sticky-work-complete-notifications
```

### Debug Options

#### `--quiet`

Suppress preflight messages and reduce output.

```bash
# Minimal output
claude-composer --quiet
```

#### `--allow-buffer-snapshots`

Enable Ctrl+Shift+S terminal snapshots for debugging.

```bash
# Enable snapshot feature
claude-composer --allow-buffer-snapshots
```

**Usage**: Press Ctrl+Shift+S to capture terminal buffer to clipboard.

#### `--log-all-pattern-matches`

Log all pattern matching to `~/.claude-composer/logs/` for debugging rulesets.

```bash
# Debug ruleset patterns
claude-composer --log-all-pattern-matches
```

**Log location**: `~/.claude-composer/logs/pattern-matches-{timestamp}.log`

## Subcommands

### `cc-init`

Initialize a new configuration file interactively.

```bash
claude-composer cc-init [options]
```

#### Options

##### `--project`

Create project-specific configuration in current directory.

```bash
# Create .claude-composer/config.yaml
claude-composer cc-init --project
```

##### `--use-yolo-ruleset`

Use YOLO ruleset (accepts all operations).

```bash
claude-composer cc-init --use-yolo-ruleset
```

##### `--use-cautious-ruleset`

Use cautious ruleset (recommended - accepts project operations).

```bash
claude-composer cc-init --use-cautious-ruleset
```

##### `--use-safe-ruleset`

Use safe ruleset (requires confirmation for all operations).

```bash
claude-composer cc-init --use-safe-ruleset
```

##### `--use-core-toolset` / `--no-use-core-toolset`

Enable or disable core toolset.

```bash
# With core toolset
claude-composer cc-init --use-core-toolset

# Without core toolset
claude-composer cc-init --no-use-core-toolset
```

#### Examples

```bash
# Interactive global setup
claude-composer cc-init

# Quick project setup with defaults
claude-composer cc-init --project --use-cautious-ruleset --use-core-toolset

# Minimal safe setup
claude-composer cc-init --use-safe-ruleset --no-use-core-toolset
```

## Pass-through Arguments

All unrecognized arguments are passed to Claude Code:

```bash
# These go to Claude Code
claude-composer --model claude-3-opus-20240229
claude-composer --print
claude-composer "my prompt"
```

### Common Claude Code Arguments

- `--model <model>` - Specify AI model
- `--print` - Print mode (no interaction)
- `--help` - Show help (both tools)

## Environment Variables

### `CLAUDE_COMPOSER_CONFIG_DIR`

Override configuration directory location.

```bash
CLAUDE_COMPOSER_CONFIG_DIR=~/custom-config claude-composer
```

### `CLAUDE_COMPOSER_NO_NOTIFY`

Disable all notifications.

```bash
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer
```

### `FORCE_COLOR`

Control color output.

```bash
# Force colors
FORCE_COLOR=1 claude-composer

# Disable colors
FORCE_COLOR=0 claude-composer
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `130` - Interrupted (Ctrl+C)

## Configuration Precedence

1. Command-line flags (highest priority)
2. Project configuration (`.claude-composer/config.yaml`)
3. Global configuration (`~/.claude-composer/config.yaml`)
4. Built-in defaults (lowest priority)

## Common Usage Patterns

### Basic Usage

```bash
# Use configuration defaults
claude-composer

# Override with specific ruleset
claude-composer --ruleset internal:yolo

# Combine with Claude Code options
claude-composer --ruleset internal:cautious --model claude-3-opus-20240229
```

### Project Setup

```bash
# Initialize project
cd my-project
claude-composer cc-init --project --use-cautious-ruleset

# Start coding
claude-composer
```

### CI/CD Usage

```bash
# Automated environment
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer \
  --ruleset internal:cautious \
  --dangerously-allow-in-dirty-directory \
  --dangerously-suppress-automatic-acceptance-confirmation
```

### Debugging Rulesets

```bash
# Enable pattern logging
claude-composer --log-all-pattern-matches --ruleset my-rules

# Check logs
tail -f ~/.claude-composer/logs/pattern-matches-*.log
```

### Maximum Safety

```bash
# All manual confirmations
claude-composer --ruleset internal:safe
```

### Maximum Automation

```bash
# Accept everything (use with caution!)
claude-composer \
  --ruleset internal:yolo \
  --dangerously-suppress-automatic-acceptance-confirmation
```

## Option Combinations

### Safe Development

```bash
claude-composer \
  --ruleset internal:cautious \
  --toolset internal:core \
  --show-notifications
```

### Automated Scripts

```bash
claude-composer \
  --ruleset internal:yolo \
  --no-show-notifications \
  --quiet \
  --dangerously-suppress-automatic-acceptance-confirmation
```

### Debugging Setup

```bash
claude-composer \
  --ruleset internal:safe \
  --log-all-pattern-matches \
  --allow-buffer-snapshots \
  --sticky-notifications
```

## Troubleshooting

### Options Not Working

1. **Check option spelling** - Use exact option names
2. **Verify option order** - Claude Composer options before Claude Code args
3. **Check configuration** - Some options may be overridden by config files

### Unexpected Behavior

1. **Use `--ignore-global-config`** to test without global settings
2. **Add `--quiet`** to reduce noise
3. **Enable `--log-all-pattern-matches`** for debugging

### Getting Help

```bash
# Claude Composer help
claude-composer --help

# Both tools' help
claude-composer -- --help
```

## See Also

- [Configuration Guide](./configuration.md) - Configuration files
- [Rulesets Reference](./rulesets.md) - Ruleset options
- [Toolsets Reference](./toolsets.md) - Toolset options
- [Examples](./examples.md) - Common workflows
- [Environment Variables](./environment-variables.md) - Environment configuration
