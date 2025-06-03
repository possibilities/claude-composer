# Remote Notifications

Claude Composer can send notifications to Discord and WhatsApp in addition to your desktop notifications. This is useful for monitoring long-running tasks or getting alerts when working on remote servers.

## Configuration

### 1. Create Configuration File

Copy the example configuration file to your home directory:

```bash
cp remote-notifications.example.yaml ~/.claude-composer/remote-notifications.yaml
```

### 2. Set Up Discord Webhook

1. Go to your Discord channel settings
2. Click "Edit Channel" → "Integrations" → "Webhooks"
3. Create a new webhook and copy the URL
4. Add the webhook URL to your configuration file:

```yaml
discord:
  webhook_url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

subscriber_id: 'your-name'
```

### 3. Enable Remote Notifications

You can enable remote notifications in two ways:

#### Command Line Flag

```bash
claude-composer --send-remote-notifications [your command]
```

#### Configuration File

Add to your `~/.claude-composer/config.yaml`:

```yaml
send_remote_notifications: true
```

## How It Works

When remote notifications are enabled:

- Only **sticky notifications** are sent remotely (to avoid spam)
- Notifications are color-coded by type in Discord
- Both local desktop and remote notifications are sent

### Notification Types Sent Remotely

1. **Work Complete** - When Claude Composer finishes a task (green)
2. **Work Complete Record** - When a new longest work session is achieved (gold)
3. **Prompted Confirmations** - When user confirmation is needed (orange)
4. **Explicitly Sticky Notifications** - Any notification marked as undismissable

### Notification Types NOT Sent Remotely

1. **Work Started** - Too frequent, not sticky by default
2. **Dismissed Confirmations** - Auto-dismissed actions, not sticky by default
3. **Terminal Snapshots** - Quick notifications, not sticky by default
4. **Regular Notifications** - Any non-sticky notification

## Discord Message Format

Messages appear as rich embeds with:

- **Title**: Always "🤖 Claude Composer"
- **Description**: The notification message
- **Color**: Based on notification type
- **Timestamp**: When the notification was sent
- **Footer**: Shows the notification type

## WhatsApp Support

WhatsApp support requires a WhatsApp Business API account and is more complex to set up. The configuration would look like:

```yaml
whatsapp:
  access_token: 'YOUR_WHATSAPP_ACCESS_TOKEN'
  sender_number: '+14151234567'
  recipient_number: '+15558675309'
```

Currently, only Discord is fully implemented.

## Troubleshooting

### Notifications Not Sending

1. Check that `~/.claude-composer/remote-notifications.yaml` exists
2. Verify the Discord webhook URL is correct
3. Ensure `--send-remote-notifications` flag is used or config is set
4. Check console for error messages about remote notification initialization

### Testing Your Setup

1. Run a command that triggers a sticky notification:

```bash
claude-composer --send-remote-notifications --sticky-notifications echo "test"
```

2. You should see both a desktop notification and a Discord message

## Security Notes

- Keep your `remote-notifications.yaml` file private
- Discord webhook URLs should not be committed to version control
- The configuration file is only read from your home directory for security
