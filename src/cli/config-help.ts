export function getConfigHelp(): string {
  return `
Configuration File Options for claude-composer

Configuration files are stored in ~/.claude-composer/ (or CLAUDE_COMPOSER_CONFIG_DIR)
Main config: ~/.claude-composer/config.yaml
Toolsets: ~/.claude-composer/toolsets/<name>.yaml

MAIN CONFIGURATION OPTIONS (config.yaml)
========================================

show_notifications: boolean (optional)
  Show desktop notifications for file edits, creates, and prompts
  Default: false

sticky_notifications: boolean (optional)
  Enable notifications that stay on screen until manually dismissed
  Also enables show_notifications when set to true
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


EXAMPLE CONFIG FILE (config.yaml)
=================================

show_notifications: true
sticky_notifications: false
dangerously_dismiss_edit_file_prompts: false
dangerously_dismiss_create_file_prompts: false
dangerously_dismiss_bash_command_prompts: false
dangerously_allow_in_dirty_directory: false
dangerously_allow_without_version_control: false
toolsets:
  - development
  - testing
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


Note: Command-line arguments always take precedence over configuration file settings.
`
}
