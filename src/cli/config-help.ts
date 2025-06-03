export function getConfigHelp(): string {
  return `
Configuration File Options for claude-composer

Configuration files can be stored in two locations:
1. Global config: ~/.claude-composer/config.yaml (or CLAUDE_COMPOSER_CONFIG_DIR)
2. Project config: .claude-composer/config.yaml (in current working directory)

Toolsets: ~/.claude-composer/toolsets/<name>.yaml
Rulesets: ~/.claude-composer/rulesets/<name>.yaml

QUICK REFERENCE
===============
- Main config: General settings, dangerous flags, toolsets, rulesets
- Toolsets: Control which tools are allowed/disallowed, MCP servers
- Rulesets: Fine-grained prompt dismissal rules with path/domain patterns
- Path patterns: Use globs for file/directory matching (**, *, ?, etc.)
- Domain patterns: Use wildcards for domain matching (*.example.com)

MAIN CONFIGURATION OPTIONS (config.yaml)
========================================

NOTIFICATION SETTINGS
=====================

show_notifications: boolean (optional)
  Master control for all notifications
  Default: true

show_confirm_notify: boolean (optional)
  Show notifications for file operations (edit, create, bash, read, fetch)
  Only applies when show_notifications is true
  Default: true

show_dismissed_confirm_notify: boolean (optional)
  Show notifications for auto-dismissed actions
  Only applies when show_confirm_notify is true
  Default: false

show_prompted_confirm_notify: boolean (optional)
  Show notifications when user is prompted
  Only applies when show_confirm_notify is true
  Default: true

confirm_notify: object (optional)
  Fine-grained control over specific confirmation types
  Only applies when show_confirm_notify is true
  Structure:
    edit_file: boolean (default: true)
    create_file: boolean (default: true)
    bash_command: boolean (default: true)
    read_file: boolean (default: true)
    fetch_content: boolean (default: true)

show_work_started_notifications: boolean (optional)
  Show notification when Claude Composer starts working
  Default: false

show_work_complete_notifications: boolean (optional)
  Show notification when Claude Composer is done working
  Default: true

show_work_complete_record_notifications: boolean (optional)
  Show record-breaking notifications for longest work sessions
  Only applies when show_work_complete_notifications is true
  Default: true

sticky_notifications: object|boolean (optional)
  Control notification stickiness behavior
  Can be a boolean (for backward compatibility) or object with per-type control
  Boolean true = all notifications sticky
  Object format:
    global: boolean (default: false)
    work_started: boolean (default: false)
    work_complete: boolean (default: true)
    work_complete_record: boolean (default: true)
    prompted_confirmations: boolean (default: true)
    dismissed_confirmations: boolean (default: false)
    terminal_snapshot: boolean (default: false)

# Legacy notification settings (kept for backward compatibility)
notify_work_started: boolean (optional)
  Deprecated: Use show_work_started_notifications instead
  Default: false

notify_work_complete: boolean (optional)
  Deprecated: Use show_work_complete_notifications instead
  Default: true

send_remote_notifications: boolean (optional)
  Send notifications to Discord/WhatsApp when enabled
  Requires ~/.claude-composer/remote-notifications.yaml configuration file
  Only sticky notifications are sent remotely to avoid spam
  Default: false

dangerously_dismiss_edit_file_prompts: boolean (optional)
  Automatically dismiss edit file prompts without user confirmation
  Default: false

dangerously_dismiss_create_file_prompts: boolean (optional)
  Automatically dismiss create file prompts without user confirmation
  Default: false

dangerously_dismiss_bash_command_prompts: boolean (optional)
  Automatically dismiss bash command prompts without user confirmation
  Default: false

dangerously_dismiss_read_files_prompts: boolean (optional)
  Automatically dismiss read files prompts without user confirmation
  Default: false

dangerously_dismiss_fetch_content_prompts: boolean (optional)
  Automatically dismiss fetch content prompts without user confirmation
  Default: false

dangerously_allow_in_dirty_directory: boolean (optional)
  Allow running in a directory with uncommitted git changes
  Default: false

dangerously_allow_without_version_control: boolean (optional)
  Allow running in a directory not under version control
  Default: false

toolsets: array of strings (optional)
  List of toolset names to load from ~/.claude-composer/toolsets/
  Example: ["custom-tools", "project-specific"]
  Default: []

rulesets: array of strings (optional)
  List of ruleset names to load from ~/.claude-composer/rulesets/
  Example: ["development", "production"]
  Default: []

log_all_pattern_matches: boolean (optional)
  Log all pattern matches to ~/.claude-composer/logs/pattern-matches-<pattern.id>.jsonl
  Default: false

allow_buffer_snapshots: boolean (optional)
  Enable Ctrl+Shift+S to save terminal buffer snapshots to ~/.claude-composer/logs/
  Default: false

allow_adding_project_tree: boolean (optional)
  Enable the add-tree-trigger pattern for project tree display
  Default: false

allow_adding_project_changes: boolean (optional)
  Enable the add-changes-trigger pattern for git diff display
  Default: false


TOOLSET CONFIGURATION OPTIONS (<name>.yaml)
===========================================

allowed: array of strings (optional)
  List of allowed tools that can be used
  Example: ["read_file", "write_file", "run_bash_command"]

disallowed: array of strings (optional)
  List of tools that should be disabled
  Example: ["delete_file", "run_python"]

mcp: record (optional)
  MCP server configurations for external tool integrations
  Structure depends on specific MCP server requirements


RULESET CONFIGURATION OPTIONS (<name>.yaml)
==========================================

dismiss_project_edit_file_prompts: boolean | object (optional)
  Automatically dismiss edit file prompts for files in project root
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_project_create_file_prompts: boolean | object (optional)
  Automatically dismiss create file prompts for files in project root
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_project_bash_command_prompts: boolean | object (optional)
  Automatically dismiss bash command prompts running in project root
  Can be a boolean (dismisses all) or an object with directory glob patterns:
    paths: array of directory glob patterns to match command directories
  Note: Commands without directory info cannot be dismissed by path patterns
  Default: false

dismiss_project_read_files_prompts: boolean | object (optional)
  Automatically dismiss read files prompts for files in project root
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_global_edit_file_prompts: boolean | object (optional)
  Automatically dismiss edit file prompts for files outside the project
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_global_create_file_prompts: boolean | object (optional)
  Automatically dismiss create file prompts for files outside the project
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_global_bash_command_prompts: boolean | object (optional)
  Automatically dismiss bash command prompts running outside the project
  Can be a boolean (dismisses all) or an object with directory glob patterns:
    paths: array of directory glob patterns to match command directories
  Note: Commands without directory info cannot be dismissed by path patterns
  Default: false

dismiss_global_read_files_prompts: boolean | object (optional)
  Automatically dismiss read files prompts for files outside the project
  Can be a boolean (dismisses all) or an object with glob patterns:
    paths: array of glob patterns to match files for auto-dismissal
  Default: false

dismiss_fetch_content_prompts: boolean | object (optional)
  Automatically dismiss fetch content prompts for specified domains
  Can be a boolean (dismisses all) or an object with domain patterns:
    domains: array of domain patterns to match for auto-dismissal
  Domain patterns support wildcards (*) for flexible matching
  Default: false


EXAMPLE CONFIG FILE (config.yaml)
=================================

# Master notification control
show_notifications: true

# Confirmation notifications (default configuration)
show_confirm_notify: true
show_dismissed_confirm_notify: false
show_prompted_confirm_notify: true

# Work notifications
show_work_started_notifications: false
show_work_complete_notifications: true
show_work_complete_record_notifications: true

# Smart sticky defaults
sticky_notifications:
  work_complete: true
  work_complete_record: true
  prompted_confirmations: true
  dismissed_confirmations: false

# Other settings
dangerously_dismiss_edit_file_prompts: false
dangerously_dismiss_create_file_prompts: false
dangerously_dismiss_bash_command_prompts: false
dangerously_dismiss_read_files_prompts: false
dangerously_dismiss_fetch_content_prompts: false
dangerously_allow_in_dirty_directory: false
dangerously_allow_without_version_control: false
toolsets:
  - development
  - testing
rulesets:
  - safe-mode
log_all_pattern_matches: false
allow_buffer_snapshots: true
allow_adding_project_tree: true
allow_adding_project_changes: true


EXAMPLE: Minimal Noise Configuration
====================================

# Only show prompted confirmations (sticky)
show_notifications: true
# All other settings use smart defaults


EXAMPLE: Power User Configuration
=================================

# See everything
show_notifications: true
show_dismissed_confirm_notify: true
show_work_started_notifications: true

# Make everything sticky
sticky_notifications:
  global: true


EXAMPLE: Work Tracking Only
============================

# Only work notifications, no confirmations
show_notifications: true
show_confirm_notify: false
show_work_started_notifications: true
show_work_complete_notifications: true


EXAMPLE: Custom Confirmation Types
==================================

# Disable noisy confirmation types
show_notifications: true
confirm_notify:
  edit_file: true
  create_file: true
  bash_command: true
  read_file: false      # Too noisy
  fetch_content: false  # Too noisy


EXAMPLE: Non-Sticky Work Notifications
======================================

# Work notifications that auto-dismiss
show_notifications: true
show_work_complete_notifications: true
sticky_notifications:
  work_complete: false
  work_complete_record: false


EXAMPLE TOOLSET FILE (development.yaml)
=======================================

allowed:
  - read_file
  - write_file
  - run_bash_command
  - search_files
  - list_directory
disallowed:
  - delete_file
mcp:
  server1:
    command: "npx"
    args: ["@example/mcp-server"]


EXAMPLE RULESET FILE (safe-mode.yaml)
=====================================

# Boolean format - dismisses all prompts of this type
dismiss_project_edit_file_prompts: true
dismiss_project_create_file_prompts: true
dismiss_project_bash_command_prompts: true
dismiss_project_read_files_prompts: true
dismiss_global_edit_file_prompts: false
dismiss_global_create_file_prompts: false
dismiss_global_bash_command_prompts: false
dismiss_global_read_files_prompts: false
dismiss_fetch_content_prompts: false


EXAMPLE RULESET FILE WITH PATHS (selective-dismiss.yaml)
=========================================================

# Object format - only dismisses prompts for files matching the patterns
dismiss_project_edit_file_prompts:
  paths:
    - "**/*.test.ts"
    - "**/*.spec.js"
    - "src/generated/**/*"

dismiss_project_create_file_prompts:
  paths:
    - "dist/**/*"
    - "build/**/*"
    - "**/*.d.ts"

# Bash command dismissal with directory patterns
dismiss_project_bash_command_prompts:
  paths:
    - "src/**"      # Auto-dismiss commands in src directory
    - "test/**"     # Auto-dismiss commands in test directory
    - "scripts/**"  # Auto-dismiss commands in scripts directory

dismiss_global_bash_command_prompts:
  paths:
    - "~/code/**"   # Auto-dismiss commands in code directory
    - "/tmp/**"     # Auto-dismiss commands in temp directory

dismiss_project_read_files_prompts:
  paths:
    - "node_modules/**/*"
    - "**/*.lock"
    - ".git/**/*"

# Global dismissals with specific patterns
dismiss_global_edit_file_prompts:
  paths:
    - "~/.config/**/*"
    - "/tmp/**/*"

dismiss_global_create_file_prompts: false  # Never auto-dismiss global creates

dismiss_global_bash_command_prompts: false

dismiss_global_read_files_prompts:
  paths:
    - "/etc/**/*"
    - "/usr/**/*"

dismiss_fetch_content_prompts: false


EXAMPLE RULESET FILE WITH DOMAIN FILTERING (domain-dismiss.yaml)
================================================================

# Allow dismissing fetch content prompts only for specific domains
dismiss_fetch_content_prompts:
  domains:
    - "github.com"              # Exact match
    - "*.shopify.com"          # Match any subdomain of shopify.com
    - "docs.*.com"             # Match docs subdomain of any .com domain
    - "api.*.io"               # Match api subdomain of any .io domain
    - "*.trusted-partner.net"  # Match all subdomains of trusted-partner.net

# Mix with other configurations
dismiss_project_edit_file_prompts: true
dismiss_project_bash_command_prompts: false


COMPREHENSIVE EXAMPLE RULESET (advanced-dismiss.yaml)
=====================================================

# Project-level dismissals (relative to project root)
dismiss_project_edit_file_prompts:
  paths:
    - "**/*.generated.ts"      # Auto-generated files
    - "dist/**/*"              # Build output
    - "**/*.min.js"            # Minified files
    - "src/vendor/**/*"        # Third-party code

dismiss_project_create_file_prompts:
  paths:
    - "dist/**/*"              # Build directory
    - "coverage/**/*"          # Test coverage
    - "**/*.d.ts"              # TypeScript declarations
    - ".next/**/*"             # Next.js build files

dismiss_project_bash_command_prompts:
  paths:
    - "src/**"                 # Source code directories
    - "test/**"                # Test directories
    - "scripts/**"             # Script directories
    - "."                      # Project root itself

dismiss_project_read_files_prompts: true  # Allow all reads in project

# Global-level dismissals (absolute paths)
dismiss_global_edit_file_prompts:
  paths:
    - "~/.config/**/*"         # User config files
    - "~/.local/**/*"          # User local files
    - "/tmp/**/*"              # Temporary files

dismiss_global_create_file_prompts: false  # Never auto-create outside project

dismiss_global_bash_command_prompts:
  paths:
    - "~/code/**"              # Personal code directory
    - "~/projects/**"          # Projects directory
    - "/tmp/**"                # Temp directory
    - "/var/tmp/**"            # Var temp directory

dismiss_global_read_files_prompts:
  paths:
    - "/usr/local/**/*"        # Local installations
    - "/opt/**/*"              # Optional software
    - "~/.npm/**/*"            # NPM cache

# Domain-based dismissal for fetch content
dismiss_fetch_content_prompts:
  domains:
    - "*.github.com"           # GitHub and subdomains
    - "docs.*.com"             # Documentation sites
    - "localhost:*"            # Local development


PATH-BASED DISMISSAL CONFIGURATIONS
===================================

All dismiss prompt options support both boolean and path-based configurations:

Boolean Format:
  true  - Automatically dismiss ALL prompts of this type
  false - Never automatically dismiss prompts of this type (default)

Object Format:
  paths: [array of glob patterns]
  Only dismisses prompts for files/directories matching the patterns

File-based Dismissals (edit, create, read):
  - Patterns match against file paths
  - Project patterns use relative paths from project root
  - Global patterns use absolute paths

Directory-based Dismissals (bash commands):
  - Patterns match against the directory where the command runs
  - Only works for prompts that include directory information
  - Commands without directory info will show an undismissable warning


GLOB PATTERN MATCHING
=====================

Patterns use standard glob syntax (powered by picomatch):
- ** matches any number of directories
- * matches any characters except path separators
- ? matches a single character
- [abc] matches any character in the set
- {a,b,c} matches any of the alternatives
- ~ expands to home directory in patterns

File Pattern Examples:
- "**/*.ts" - all TypeScript files in any directory
- "src/**/*" - all files under the src directory
- "*.{js,jsx,ts,tsx}" - all JavaScript and TypeScript files
- "test/**/*.test.js" - all test files ending in .test.js
- "!**/*.min.js" - exclude minified files (when combined with other patterns)

Directory Pattern Examples:
- "src/**" - any directory under src/
- "~/code/**" - any directory under ~/code/
- "/tmp/**" - any directory under /tmp/
- "test/**" - any test directory

Important Notes:
- Multiple patterns are combined with OR logic (ANY match allows dismissal)
- The main config dangerously_dismiss_* flags must be enabled
- Path matching is case-sensitive on case-sensitive filesystems


DOMAIN PATTERN MATCHING FOR FETCH CONTENT PROMPTS
==================================================

When using the object format with domains for dismiss_fetch_content_prompts,
domain patterns are matched using the following rules:

- Exact domain matching: "github.com" matches only github.com
- Wildcard (*) can be used for flexible matching
- Single wildcard matches any characters greedily in both directions

Domain Pattern Examples:
- "github.com" - matches exactly github.com
- "*.github.com" - matches any subdomain of github.com (e.g., api.github.com)
- "docs.*" - matches docs subdomain of any domain (e.g., docs.google.com)
- "*.example.*" - matches any subdomain of example with any TLD
- "*" - matches any domain (effectively same as boolean true)

Important Notes:
- Domain matching is case-sensitive
- Multiple patterns are combined with OR logic (matches if ANY pattern matches)
- The main config dangerously_dismiss_fetch_content_prompts flag must be enabled
- Domain is extracted from the fetch content prompt automatically


TROUBLESHOOTING PATH-BASED DISMISSALS
=====================================

Common Issues and Solutions:

1. Bash commands without directory information:
   - Some prompts don't include directory context
   - These cannot be dismissed with path patterns
   - You'll see: "UNDISMISSABLE DIALOG BECAUSE NO DIRECTORY IS SPECIFIED"
   - Solution: Use boolean true to dismiss all, or handle individually

2. Patterns not matching as expected:
   - Check if using project vs global context correctly
   - Project paths are relative: "src/**"
   - Global paths are absolute: "/home/user/src/**"
   - Use ~ for home directory: "~/code/**"

3. Testing your patterns:
   - Start with broader patterns and narrow down
   - Use --show-notifications to see what's being dismissed
   - Check the notification to see the actual path being matched

4. Common useful patterns:
   - Generated files: "**/*.generated.*", "**/gen/**"
   - Build outputs: "dist/**", "build/**", ".next/**"
   - Dependencies: "node_modules/**", "vendor/**"
   - Test files: "**/*.test.*", "**/*.spec.*", "__tests__/**"
   - Temp files: "*.tmp", "*.temp", "/tmp/**"


SECURITY CONSIDERATIONS
=======================

When using path-based dismissals:
- Be specific with patterns to avoid unintended dismissals
- Review your patterns regularly
- Use --show-notifications to audit what's being auto-dismissed
- Consider using project-specific rulesets for sensitive projects
- Remember that dismissed prompts still execute the action


REMOTE NOTIFICATIONS CONFIGURATION (remote-notifications.yaml)
==============================================================

Remote notifications allow you to receive Claude Composer notifications on Discord or WhatsApp.
This is useful for monitoring long-running tasks or working on remote servers.

Configuration file location: ~/.claude-composer/remote-notifications.yaml

FORMAT:
=======

discord:
  webhook_url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

subscriber_id: 'your-name'  # Optional identifier shown in messages

whatsapp:  # Not yet implemented
  access_token: 'YOUR_WHATSAPP_ACCESS_TOKEN'
  sender_number: '+14151234567'
  recipient_number: '+15558675309'

SETUP:
======

1. Copy the example configuration:
   cp remote-notifications.example.yaml ~/.claude-composer/remote-notifications.yaml

2. Set up Discord webhook:
   - Go to Discord channel settings
   - Click "Edit Channel" → "Integrations" → "Webhooks"
   - Create new webhook and copy URL
   - Add webhook URL to configuration file

3. Enable remote notifications:
   - CLI flag: --send-remote-notifications
   - Or in config.yaml: send_remote_notifications: true

BEHAVIOR:
=========

- Only sticky notifications are sent remotely (to avoid spam)
- Both local desktop and remote notifications are sent
- Discord messages include color coding by notification type:
  - Green: Work Complete
  - Gold: Work Complete Record
  - Orange: Prompted Confirmations
  - Blue: Other sticky notifications

NOTIFICATION TYPES SENT REMOTELY:
=================================

1. Work Complete - When Claude Composer finishes a task
2. Work Complete Record - When achieving longest work session
3. Prompted Confirmations - When user confirmation is needed
4. Explicitly Sticky Notifications - Any notification marked as undismissable

NOTIFICATION TYPES NOT SENT REMOTELY:
=====================================

1. Work Started - Too frequent, not sticky by default
2. Dismissed Confirmations - Auto-dismissed actions
3. Terminal Snapshots - Quick notifications
4. Regular Notifications - Any non-sticky notification

TROUBLESHOOTING:
================

- Check that ~/.claude-composer/remote-notifications.yaml exists
- Verify Discord webhook URL is correct
- Ensure --send-remote-notifications flag is used or config is set
- Check console for error messages about remote notification initialization

TESTING YOUR SETUP:
===================

Run a command that triggers a sticky notification:
claude-composer --send-remote-notifications --sticky-notifications echo "test"

You should see both a desktop notification and a Discord message.


CONFIGURATION PRECEDENCE
========================

Settings are loaded with the following precedence (highest to lowest):
1. Command-line arguments (always win)
2. Project config (.claude-composer/config.yaml in current directory)
3. Global config (~/.claude-composer/config.yaml)
4. Built-in defaults

Note: For toolsets and rulesets, project config completely replaces global config (no merging).
      CLI-specified toolsets/rulesets replace both project and global toolsets/rulesets.
`
}
