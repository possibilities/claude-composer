# Notifications Guide

Claude Composer provides system notifications to keep you informed about operations without switching contexts. This guide covers all aspects of the notification system.

## Overview

Notifications appear for:

- Permission dialog confirmations
- Automatic acceptance confirmations
- Work completion events
- Errors and warnings

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

### Dialog Confirmations

When Claude requests permissions, you'll see notifications like:

- 📝 **Edit File**: "Claude wants to edit: src/index.js"
- 📁 **Create File**: "Claude wants to create: src/new-file.js"
- 🖥️ **Run Command**: "Claude wants to run: npm test"
- 🌐 **Fetch Content**: "Claude wants to fetch: github.com"

### Automatic Acceptance

When dialogs are auto-accepted based on rules:

- ✅ **Accepted**: "Automatically accepted: Edit src/index.js"
- ⚡ **Bulk Accepted**: "Automatically accepted 5 operations"

### Work Completion

When Claude finishes tasks:

- 🎉 **Completed**: "Claude has completed work"
- ✨ **Task Done**: "Task finished successfully"

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

Enable/disable specific notification types:

```bash
# File operation notifications
--show-edit-file-confirm-notify
--no-show-edit-file-confirm-notify

--show-create-file-confirm-notify
--no-show-create-file-confirm-notify

# Command notifications
--show-bash-command-confirm-notify
--no-show-bash-command-confirm-notify

# Web fetch notifications
--show-fetch-content-confirm-notify
--no-show-fetch-content-confirm-notify

# Acceptance notifications
--show-accepted-confirm-notify
--no-show-accepted-confirm-notify

# Work completion
--show-work-complete-notifications
--no-show-work-complete-notifications
```

### Configuration Example

Fine-tune notifications in config:

```yaml
# Show all notifications
show_notifications: true

# But make only work completion sticky
sticky_notifications: false
sticky_work_complete_notifications: true

# Disable specific types
show_bash_command_confirm_notify: false
show_accepted_confirm_notify: false
```

## Platform-Specific Setup

### macOS

1. **Enable notifications**:

   - System Preferences → Notifications
   - Find your terminal app
   - Allow notifications

2. **Notification Center**:

   - Notifications appear in Notification Center
   - Click to dismiss sticky notifications

3. **Do Not Disturb**:
   - Notifications respect DND mode
   - Use `--no-show-notifications` during focus time

### Linux

1. **Desktop environment**:

   - GNOME: Install `libnotify-bin`
   - KDE: Notifications work out of box
   - XFCE: Install `xfce4-notifyd`

2. **Required packages**:

   ```bash
   # Ubuntu/Debian
   sudo apt-get install libnotify-bin

   # Fedora
   sudo dnf install libnotify

   # Arch
   sudo pacman -S libnotify
   ```

3. **Testing**:
   ```bash
   # Test notification system
   notify-send "Test" "Claude Composer notification test"
   ```

### Windows

1. **Windows 10/11**:

   - Notifications work automatically
   - Appear in Action Center

2. **Windows Terminal**:

   - Best notification support
   - Recommended over Command Prompt

3. **PowerShell**:
   - Full notification support
   - May need to allow in Windows Security

## Common Patterns

### Development Workflow

Active development with important notifications:

```bash
claude-composer \
  --show-notifications \
  --no-show-accepted-confirm-notify \
  --sticky-work-complete-notifications
```

### Focused Work

Minimal interruptions:

```bash
claude-composer \
  --no-show-notifications \
  --ruleset internal:cautious
```

### Debugging

Maximum visibility:

```bash
claude-composer \
  --show-notifications \
  --sticky-notifications \
  --show-accepted-confirm-notify
```

### CI/CD

No notifications in automated environments:

```bash
CLAUDE_COMPOSER_NO_NOTIFY=1 claude-composer \
  --quiet \
  --ruleset internal:cautious
```

## Troubleshooting

### Notifications Not Appearing

1. **Check system permissions**:

   - Terminal needs notification permission
   - Check system notification settings

2. **Test notification system**:

   ```bash
   # Linux/macOS
   notify-send "Test" "Testing notifications"

   # If this doesn't work, fix system notifications first
   ```

3. **Verify not disabled**:

   ```bash
   # Check environment
   echo $CLAUDE_COMPOSER_NO_NOTIFY

   # Should be empty or 0
   ```

4. **Check configuration**:
   ```yaml
   # Ensure enabled in config
   show_notifications: true
   ```

### Too Many Notifications

If overwhelmed by notifications:

1. **Disable acceptance confirmations**:

   ```bash
   --no-show-accepted-confirm-notify
   ```

2. **Disable specific types**:

   ```bash
   --no-show-edit-file-confirm-notify \
   --no-show-create-file-confirm-notify
   ```

3. **Keep only important ones**:
   ```bash
   --show-work-complete-notifications \
   --no-show-accepted-confirm-notify
   ```

### Sticky Notifications Won't Dismiss

1. **Click notification** to dismiss
2. **Check notification center** on your platform
3. **Disable sticky mode**:
   ```bash
   --no-sticky-notifications
   ```

## Best Practices

### 1. Start with Defaults

Begin with default notification settings:

```bash
claude-composer  # Uses config defaults
```

### 2. Adjust Based on Workflow

- **Active development**: Show all, non-sticky
- **Background tasks**: Work completion only
- **Learning**: All notifications, sticky
- **Production**: No notifications

### 3. Use Environment Variables

For consistent behavior across sessions:

```bash
# In ~/.bashrc or ~/.zshrc
export CLAUDE_COMPOSER_NO_NOTIFY=0  # Ensure enabled
```

### 4. Project-Specific Settings

Different notification needs per project:

```yaml
# Project A - Active development
show_notifications: true
sticky_work_complete_notifications: true

# Project B - Maintenance mode
show_notifications: true
show_accepted_confirm_notify: false
```

### 5. Combine with Rulesets

Match notification verbosity to automation level:

```bash
# High automation = fewer notifications
claude-composer \
  --ruleset internal:yolo \
  --show-work-complete-notifications \
  --no-show-accepted-confirm-notify

# Low automation = more notifications
claude-composer \
  --ruleset internal:safe \
  --show-notifications \
  --sticky-notifications
```

## Examples

### Minimal Notifications

```bash
# Only critical notifications
claude-composer \
  --show-notifications \
  --no-show-edit-file-confirm-notify \
  --no-show-create-file-confirm-notify \
  --no-show-bash-command-confirm-notify \
  --no-show-accepted-confirm-notify \
  --show-work-complete-notifications
```

### Maximum Information

```bash
# Everything visible and sticky
claude-composer \
  --show-notifications \
  --sticky-notifications \
  --show-accepted-confirm-notify
```

### Custom Configuration

```yaml
# ~/.claude-composer/config.yaml
show_notifications: true
sticky_notifications: false

# Type-specific settings
show_edit_file_confirm_notify: true
show_create_file_confirm_notify: true
show_bash_command_confirm_notify: false
show_fetch_content_confirm_notify: true
show_accepted_confirm_notify: false
show_work_complete_notifications: true

# Sticky overrides
sticky_work_complete_notifications: true
sticky_accepted_confirm_notifications: false
```

## See Also

- [CLI Reference](./cli-reference.md) - All notification options
- [Configuration Guide](./configuration.md) - Setting defaults
- [Examples](./examples.md) - Workflow patterns
