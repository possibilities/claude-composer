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

## Platform Setup

- **macOS**: Grant terminal permissions in System Preferences
- **Linux**: Install `libnotify-bin` or equivalent
- **Windows**: Works automatically

## Common Patterns

- **Development**: Show notifications, hide acceptance confirmations
- **Focused Work**: Disable all notifications
- **CI/CD**: Use `CLAUDE_COMPOSER_NO_NOTIFY=1`

## Troubleshooting

### Not Appearing

1. Check terminal permissions
2. Verify `CLAUDE_COMPOSER_NO_NOTIFY` not set
3. Ensure `show_notifications: true`

### Too Many

Use `--no-show-accepted-confirm-notify` to reduce noise.

## See Also

- [CLI Reference](./cli-reference.md) - All options
- [Configuration Guide](./configuration.md) - Setting defaults
