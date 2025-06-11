# CLI Reference

## Synopsis

```bash
claude-composer [options] [claude-code-args]
```

## Options

### Configuration

#### `--yolo`

Accept all prompts automatically (use with caution).

```bash
claude-composer --yolo
```

#### `--toolset <name...>`

Specify toolsets to use. Can be used multiple times.

```bash
claude-composer --toolset internal:core
claude-composer --toolset internal:core --toolset my-tools
```

#### `--mode <mode>`

Start in specified mode ('act' or 'plan').

```bash
claude-composer --mode plan
```

#### `--ignore-global-config`

Ignore global configuration file.

### Safety Options

⚠️ **Warning**: These bypass safety checks.

#### `--dangerously-allow-in-dirty-directory`

Allow running with uncommitted changes.

#### `--dangerously-allow-without-version-control`

Allow running outside git.

#### `--dangerously-suppress-yolo-confirmation`

Skip the confirmation prompt when yolo mode is enabled.

### Notifications

#### `--show-notifications` / `--no-show-notifications`

Enable/disable desktop notifications.

#### `--sticky-notifications` / `--no-sticky-notifications`

Keep notifications visible until dismissed.

### Debug

#### `--quiet`

Suppress preflight messages.

#### `--allow-buffer-snapshots`

Enable Ctrl+Shift+S terminal snapshots.

#### `--log-all-pattern-matches`

Log pattern matching to `~/.claude-composer/logs/`.

## Subcommands

### `cc-init`

Initialize configuration interactively.

```bash
claude-composer cc-init [options]
```

Options:

- `--project` - Create project config
- `--use-yolo` - Enable YOLO mode (accept all prompts)
- `--use-core-toolset` / `--no-use-core-toolset` - Enable/disable core toolset

## Pass-through Arguments

Unrecognized arguments pass to Claude Code:

```bash
claude-composer --model claude-3-opus-20240229
claude-composer --print
claude-composer "my prompt"
```

## Environment Variables

- `CLAUDE_COMPOSER_CONFIG_DIR` - Override config directory
- `CLAUDE_COMPOSER_NO_NOTIFY` - Disable notifications
- `FORCE_COLOR` - Control color output

## Configuration Precedence

1. Command-line flags
2. Project config (`.claude-composer/config.yaml`)
3. Global config (`~/.claude-composer/config.yaml`)
4. Built-in defaults

## See Also

- [Configuration](./configuration.md)
- [Toolsets](./toolsets.md)
