# Notifications Guide

Claude Composer provides system notifications to keep you informed about operations without switching contexts. This guide covers all aspects of the notification system.

## Overview

Notifications appear for permission dialogs, automatic acceptances, work completion, and errors.

## Enabling Notifications

### Basic Control

```bash
# Enable notifications
claude-composer --show-notifications

# Disable notifications
claude-composer --no-show-notifications

# In configuration
show_notifications: true
```

### Environment Variable

Disable all notifications via environment:

```bash
# Disable globally
export CLAUDE_COMPOSER_NO_NOTIFY=1

# Useful for CI/CD
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer
```

## Notification Types

- **Dialog Confirmations**: File edits, creates, commands, web fetches
- **Automatic Acceptance**: When rules auto-accept operations
- **Work Completion**: When Claude finishes tasks

## Sticky Notifications

Sticky notifications remain visible until manually dismissed.

### Global Sticky Setting

```bash
# All notifications stay visible
claude-composer --sticky-notifications

# Notifications auto-dismiss (default)
claude-composer --no-sticky-notifications
```

### Per-Type Sticky Control

Control stickiness for specific notification types:

```bash
# Sticky edit confirmations only
claude-composer --sticky-edit-file-confirm-notifications

# Sticky work completion only
claude-composer --sticky-work-complete-notifications

# Sticky acceptance confirmations
claude-composer --sticky-accepted-confirm-notifications
```

## Fine-Grained Controls

### Notification Type Controls

Control specific notification types with `--show-*` and `--no-show-*` flags.

See [CLI Reference](./cli-reference.md#notification-options) for all options.

## Platform-Specific Setup

- **macOS**: Grant terminal notification permissions in System Preferences
- **Linux**: Install `libnotify-bin` or equivalent for your distribution
- **Windows**: Works automatically on Windows 10/11

## Common Patterns

- **Development**: Show notifications, hide acceptance confirmations
- **Focused Work**: Disable all notifications
- **Debugging**: Enable all notifications with sticky mode
- **CI/CD**: Use `CLAUDE_COMPOSER_NO_NOTIFY=1`

## Troubleshooting

### Notifications Not Appearing

1. Check terminal has notification permissions
2. Verify `CLAUDE_COMPOSER_NO_NOTIFY` is not set
3. Ensure `show_notifications: true` in config

### Too Many Notifications

Use `--no-show-accepted-confirm-notify` to reduce noise.

### Sticky Notifications Won't Dismiss

Click notification to dismiss or use `--no-sticky-notifications`.

## Best Practices

1. Start with default settings
2. Adjust based on workflow (active dev, background tasks, etc.)
3. Use environment variables for consistency
4. Configure per-project as needed
5. Match notification verbosity to automation level

## See Also

- [CLI Reference](./cli-reference.md) - All notification options
- [Configuration Guide](./configuration.md) - Setting defaults
- [Examples](./examples.md) - Workflow patterns
