# CLI Reference

## Synopsis

```bash
claude-composer [options] [claude-code-args]
```

## Options

### Configuration

#### `--ruleset <name...>`

Specify rulesets to use. Can be used multiple times.

```bash
claude-composer --ruleset internal:cautious
claude-composer --ruleset internal:safe --ruleset my-overrides
```

Prefixes:

- `internal:` - Built-in (safe, cautious, yolo)
- `project:` - From `.claude-composer/rulesets/`
- No prefix - From `~/.claude-composer/rulesets/`

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

#### `--dangerously-suppress-automatic-acceptance-confirmation`

Skip auto-acceptance confirmations.

### Notifications

#### `--show-notifications` / `--no-show-notifications`

Enable/disable desktop notifications.

#### `--sticky-notifications` / `--no-sticky-notifications`

Keep notifications visible until dismissed.

#### `--show-work-complete-notifications` / `--no-show-work-complete-notifications`

Show/hide work completion notifications.

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
- `--use-yolo-ruleset` - Use YOLO ruleset
- `--use-cautious-ruleset` - Use cautious
- `--use-safe-ruleset` - Use safe ruleset
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
- [Rulesets](./rulesets.md)
- [Toolsets](./toolsets.md)
