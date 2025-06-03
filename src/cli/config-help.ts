export function getConfigHelp(): string {
  return `
Configuration File Options for claude-composer

Configuration files can be stored in two locations:
1. Global config: ~/.claude-composer/config.yaml (or CLAUDE_COMPOSER_CONFIG_DIR)
2. Project config: .claude-composer/config.yaml (in current working directory)

Toolsets: ~/.claude-composer/toolsets/<name>.yaml
Rulesets: ~/.claude-composer/rulesets/<name>.yaml

MAIN CONFIGURATION OPTIONS (config.yaml)
========================================

show_notifications: boolean (optional)
  Show desktop notifications for file edits, creates, and prompts
  Default: false

sticky_notifications: boolean (optional)
  Enable notifications that stay on screen until manually dismissed
  Also enables show_notifications when set to true
  Default: false

notify_work_started: boolean (optional)
  Show notification when Claude Composer starts working
  Default: false

notify_work_complete: boolean (optional)
  Show notification when Claude Composer is done working
  Default: true

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

dismiss_project_bash_command_prompts: boolean (optional)
  Automatically dismiss bash command prompts running in project root
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

dismiss_global_bash_command_prompts: boolean (optional)
  Automatically dismiss bash command prompts running outside the project
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

show_notifications: true
sticky_notifications: false
notify_work_started: false
notify_work_complete: true
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

# Mix of boolean and object formats
dismiss_project_bash_command_prompts: true  # Dismiss all bash prompts in project

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


GLOB PATTERN MATCHING FOR DISMISS PROMPTS
==========================================

When using the object format with paths for dismiss prompt configurations,
glob patterns are matched using the following rules:

- Patterns use standard glob syntax (powered by picomatch)
- ** matches any number of directories
- * matches any characters except path separators
- ? matches a single character
- [abc] matches any character in the set
- {a,b,c} matches any of the alternatives

Pattern Examples:
- "**/*.ts" - all TypeScript files in any directory
- "src/**/*" - all files under the src directory
- "*.{js,jsx,ts,tsx}" - all JavaScript and TypeScript files in current directory
- "test/**/*.test.js" - all test files ending in .test.js under test directory
- "!**/*.min.js" - exclude minified JavaScript files (when used with other patterns)

Important Notes:
- Patterns are evaluated relative to the project root for project_* settings
- Patterns are evaluated as absolute paths for global_* settings
- Multiple patterns are combined with OR logic (matches if ANY pattern matches)
- The main config dangerously_dismiss_* flags must be enabled for these to work
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
