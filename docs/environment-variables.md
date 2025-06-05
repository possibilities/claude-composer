# Environment Variables

Claude Composer supports several environment variables to customize its behavior without modifying configuration files.

## Configuration Variables

### `CLAUDE_COMPOSER_CONFIG_DIR`

Override the default configuration directory location.

```bash
# Use custom config directory
CLAUDE_COMPOSER_CONFIG_DIR=~/custom-config claude-composer

# Example with project-specific config
CLAUDE_COMPOSER_CONFIG_DIR=/path/to/project/.config claude-composer
```

## UI Variables

### `CLAUDE_COMPOSER_NO_NOTIFY`

Disable system notifications entirely.

```bash
# Run without any notifications
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer

# Useful for CI/CD environments
export CLAUDE_COMPOSER_NO_NOTIFY=1
```

### `FORCE_COLOR`

Force color output in terminals that don't auto-detect color support.

```bash
# Enable colors in non-TTY environments
FORCE_COLOR=1 claude-composer

# Disable colors explicitly
FORCE_COLOR=0 claude-composer
```

## Usage Examples

### Combining Variables

```bash
# Custom config with notifications disabled
CLAUDE_COMPOSER_CONFIG_DIR=~/work-config \
CLAUDE_COMPOSER_NO_NOTIFY=1 \
claude-composer --ruleset internal:yolo
```

### Setting Defaults in Shell Profile

```bash
# Add to ~/.bashrc or ~/.zshrc
export CLAUDE_COMPOSER_CONFIG_DIR=~/my-claude-config
export FORCE_COLOR=1
```

### CI/CD Usage

```bash
# In CI pipeline
export CLAUDE_COMPOSER_NO_NOTIFY=1
export FORCE_COLOR=0
claude-composer --ruleset internal:cautious
```
