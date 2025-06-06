# Environment Variables

Claude Composer supports environment variables to customize behavior without modifying config files.

## Configuration

### `CLAUDE_COMPOSER_CONFIG_DIR`

Override the default configuration directory.

```bash
CLAUDE_COMPOSER_CONFIG_DIR=~/custom-config claude-composer
```

## UI Controls

### `CLAUDE_COMPOSER_NO_NOTIFY`

Disable system notifications.

```bash
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer
```

### `FORCE_COLOR`

Control color output in terminals.

```bash
FORCE_COLOR=1 claude-composer  # Enable colors
FORCE_COLOR=0 claude-composer  # Disable colors
```

## Examples

```bash
# Multiple variables
CLAUDE_COMPOSER_CONFIG_DIR=~/work-config \
CLAUDE_COMPOSER_NO_NOTIFY=1 \
claude-composer --ruleset internal:yolo

# Shell profile defaults
export CLAUDE_COMPOSER_CONFIG_DIR=~/my-claude-config
export FORCE_COLOR=1
```
