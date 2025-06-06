# Notifications Guide

System notifications keep you informed without switching contexts.

## Basic Control

```bash
# Enable/disable notifications
claude-composer --show-notifications
claude-composer --no-show-notifications

# Disable via environment
export CLAUDE_COMPOSER_NO_NOTIFY=1
```

## Notification Types

- **Dialog Confirmations**: File operations and commands
- **Automatic Acceptance**: When rules auto-accept
- **Work Completion**: When Claude finishes tasks

## Sticky Notifications

Notifications that remain visible until dismissed:

```bash
# All notifications sticky
claude-composer --sticky-notifications

# Specific types only
claude-composer --sticky-edit-file-confirm-notifications
claude-composer --sticky-work-complete-notifications
```

## See Also

- [CLI Reference](./cli-reference.md) - All options
- [Configuration Guide](./configuration.md) - Setting defaults
