# Claude Composer

A powerful wrapper for the Claude Code CLI that adds pattern matching, automated responses, notifications, and advanced configuration management.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features Overview](#features-overview)
- [Configuration](#configuration)
- [Pattern Matching](#pattern-matching)
- [Toolsets](#toolsets)
- [Safety Features](#safety-features)
- [Command Line Options](#command-line-options)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites
- Node.js 18+ 
- Claude Code CLI installed
- Git (required for safety checks)

### Install Claude Composer
```bash
npm install -g claude-composer
```

### Verify Installation
```bash
claude-composer --version
```

## Quick Start

### Basic Usage
Simply replace `claude` with `claude-composer` in your commands:

```bash
# Instead of: claude "Help me write a function"
claude-composer "Help me write a function"
```

### First Run Setup
On first run, Claude Composer will:
1. Create configuration directory at `~/.claude-composer/`
2. Check for version control in your project
3. Create backups of your Claude CLI installation
4. Launch Claude with enhanced features

## Features Overview

### 🎯 Pattern Matching & Auto-Response
- **Automatic prompt dismissal** - Skip repetitive confirmation prompts
- **Custom pattern detection** - Define your own automation rules
- **Data extraction** - Capture and reuse information from Claude's output

### 🔔 Desktop Notifications
- **Pattern match alerts** - Get notified when specific patterns are detected
- **Project-aware** - Shows which project triggered the notification
- **Configurable** - Enable/disable as needed

### ⚡ Toolset Management
- **Predefined tool collections** - Create reusable sets of allowed/disallowed tools
- **MCP server configuration** - Easily configure Model Context Protocol servers
- **Project-specific settings** - Different toolsets for different projects

### 🛡️ Safety Features
- **Version control integration** - Warns about uncommitted changes
- **Backup system** - Automatically backs up Claude CLI before modifications
- **Confirmation prompts** - Multiple safety layers for dangerous operations

## Configuration

### Configuration File Location
Configuration is stored at `~/.claude-composer/config.yaml`

### Basic Configuration
```yaml
# Enable/disable desktop notifications
show_notifications: true

# Safety settings
dangerously_dismiss_edit_file_prompts: false
dangerously_dismiss_create_file_prompts: false
dangerously_dismiss_bash_command_prompts: false
dangerously_allow_in_dirty_directory: false
dangerously_allow_without_version_control: false

# Default toolsets to load
toolsets:
  - core
  - development

# Enable pattern match logging
log_all_pattern_matches: false
```

### Configuration Options

#### Notification Settings
```yaml
show_notifications: true  # Enable desktop notifications
```

#### Safety Settings
```yaml
# Automatically dismiss file edit confirmation prompts
dangerously_dismiss_edit_file_prompts: false

# Automatically dismiss file creation confirmation prompts  
dangerously_dismiss_create_file_prompts: false

# Automatically dismiss bash command confirmation prompts
dangerously_dismiss_bash_command_prompts: false

# Allow running in directories with uncommitted git changes
dangerously_allow_in_dirty_directory: false

# Allow running in directories without version control
dangerously_allow_without_version_control: false
```

#### Toolset Configuration
```yaml
# List of default toolsets to load
toolsets:
  - core
  - web-development
  - data-analysis
```

#### Debugging Settings
```yaml
# Log all pattern matches to files for debugging
log_all_pattern_matches: false
```

## Pattern Matching

### Overview
Claude Composer can detect patterns in Claude's output and automatically respond. This is useful for:
- Skipping repetitive confirmation prompts
- Automating common workflows
- Extracting information from Claude's responses

### Built-in Patterns

#### Edit File Prompt
**Triggers when:** Claude asks to edit a file
**Pattern:** 
```
Edit file
Do you want to make this edit to {{ fileName }}?
❯ 1. Yes
2. Yes, and don't ask again this session (shift+tab)
3. No, and tell Claude what to do differently (esc)
```
**Auto-response:** Selects "1. Yes"
**Enable with:** `--dangerously-dismiss-edit-file-prompts`

#### Create File Prompt
**Triggers when:** Claude asks to create a new file
**Pattern:**
```
Create file
Do you want to create {{ fileName }}?
❯ 1. Yes
2. Yes, and don't ask again this session (shift+tab)
3. No, and tell Claude what to do differently (esc)
```
**Auto-response:** Selects "1. Yes"
**Enable with:** `--dangerously-dismiss-create-file-prompts`

#### Bash Command Prompt
**Triggers when:** Claude asks to run a bash command
**Pattern:**
```
Bash command
Do you want to proceed?
❯ 1. Yes
2. Yes, and don't ask again for
3. No, and tell Claude what to do differently (esc)
```
**Auto-response:** Selects "1. Yes"
**Enable with:** `--dangerously-dismiss-bash-command-prompts`

#### Read Files Prompt
**Triggers when:** Claude asks to read files
**Pattern:**
```
Read files
Read({{ fileName }})
Do you want to proceed?
❯ 1. Yes
2. No, and tell Claude what to do differently (esc)
```
**Auto-response:** Selects "1. Yes"

### Pattern Placeholders
Patterns can extract data using placeholder syntax:

#### Simple Placeholders
```yaml
pattern: "Processing file {{ fileName }}"
```
Matches: "Processing file config.json"
Extracts: `fileName = "config.json"`

#### Multiline Placeholders
```yaml
pattern:
  - "Edit file"
  - "{{ diffContent | multiline }}"
  - "Do you want to proceed?"
```
Captures everything between "Edit file" and "Do you want to proceed?" as `diffContent`.

### Custom Patterns
You can define custom patterns by setting the `CLAUDE_PATTERNS_PATH` environment variable:

```bash
export CLAUDE_PATTERNS_PATH="/path/to/my/patterns.js"
claude-composer "Your prompt here"
```

Example custom patterns file:
```javascript
export const patterns = [
  {
    id: 'custom-welcome',
    pattern: ['Welcome to {{ projectName }}'],
    response: 'hello\n',
  },
  {
    id: 'error-handler',
    pattern: ['Error:', '{{ errorMessage }}'],
    response: 'retry\n',
  }
]
```

### Pattern Logging
Enable pattern match logging for debugging:

```bash
claude-composer --log-all-pattern-matches "Your prompt"
```

Logs are saved to `~/.claude-composer/logs/pattern-matches-<pattern-id>.jsonl`

## Toolsets

### Overview
Toolsets are collections of tool configurations that can be easily applied to Claude sessions. They define:
- Which tools are allowed/disallowed
- MCP server configurations
- Reusable settings for different workflows

### Creating Toolsets
Create toolset files in `~/.claude-composer/toolsets/`

#### Basic Toolset
```yaml
# ~/.claude-composer/toolsets/basic.yaml
allowed:
  - EditFile
  - CreateFile
  - ReadFile
disallowed:
  - BashCommand
  - DeleteFile
```

#### Advanced Toolset with MCP
```yaml
# ~/.claude-composer/toolsets/web-dev.yaml
allowed:
  - EditFile
  - CreateFile
  - ReadFile
  - BashCommand
disallowed:
  - SystemCommand

mcp:
  # Git integration server
  git-mcp:
    type: stdio
    command: git-mcp-server
    args: ["--verbose"]
  
  # Database server
  db-mcp:
    type: http
    url: http://localhost:3000/mcp
    headers:
      Authorization: "Bearer ${DB_TOKEN}"
```

### Using Toolsets

#### Command Line
```bash
# Use a specific toolset
claude-composer --toolset web-dev "Help me build a React app"

# Use multiple toolsets (they merge)
claude-composer --toolset core --toolset web-dev "Your prompt"
```

#### Configuration File
```yaml
# ~/.claude-composer/config.yaml
toolsets:
  - core
  - web-dev
```

#### Disable Default Toolsets
```bash
claude-composer --no-default-toolsets --toolset specific-toolset "Prompt"
```

### Example Toolsets

#### Core Development
```yaml
# ~/.claude-composer/toolsets/core.yaml
allowed:
  - EditFile
  - CreateFile
  - ReadFile
  - BashCommand
disallowed:
  - SystemCommand
  - NetworkRequest

mcp:
  file-watcher:
    type: stdio
    command: file-watcher-mcp
```

#### Data Science
```yaml
# ~/.claude-composer/toolsets/data-science.yaml
allowed:
  - EditFile
  - CreateFile
  - ReadFile
  - BashCommand
  - PythonREPL
  - DataVisualization
disallowed:
  - SystemCommand

mcp:
  jupyter-server:
    type: http
    url: http://localhost:8888/mcp
  
  pandas-helper:
    type: stdio
    command: pandas-mcp-server
    args: ["--mode", "analysis"]
```

#### Safe Mode
```yaml
# ~/.claude-composer/toolsets/safe.yaml
allowed:
  - ReadFile
  - EditFile
disallowed:
  - BashCommand
  - CreateFile
  - DeleteFile
  - SystemCommand
  - NetworkRequest
```

## Safety Features

### Version Control Integration

#### Git Status Checking
Claude Composer checks your git status and warns about:
- **Uncommitted changes** - Modified files that aren't committed
- **Untracked files** - New files not added to git
- **No version control** - Directories without git initialization

#### Safety Prompts
```bash
※ Running in directory with uncommitted changes
※ Do you want to continue? (y/N): 
```

#### Override Safety Checks
```bash
# Allow dirty directory
claude-composer --dangerously-allow-in-dirty-directory "Your prompt"

# Allow no version control
claude-composer --dangerously-allow-without-version-control "Your prompt"

# Allow both
claude-composer \
  --dangerously-allow-in-dirty-directory \
  --dangerously-allow-without-version-control \
  "Your prompt"
```

### Backup System

#### Automatic Backups
Claude Composer automatically creates backups of your Claude CLI installation:
- **Location:** `~/.claude-composer/backups/`
- **Naming:** MD5 hash of the Claude CLI binary
- **Retention:** Keeps 5 most recent backups
- **Triggered:** Before each Claude Composer run

#### Backup Management
```bash
# View backup location
ls ~/.claude-composer/backups/

# Restore from backup (manual process)
cp ~/.claude-composer/backups/<hash>/* ~/.claude/local/
```

### Go Off Mode (YOLO Mode)

#### Overview
"Go Off" mode enables all dangerous settings with a single flag, removing all safety prompts.

#### Usage
```bash
claude-composer --go-off "Do something risky"
```

#### What it enables:
- `dangerously_dismiss_edit_file_prompts: true`
- `dangerously_dismiss_create_file_prompts: true`
- `dangerously_dismiss_bash_command_prompts: true`

#### Safety Confirmation
```
╔════════════════════════════════════════════════════════════════╗
║                       🚨 DANGER ZONE 🚨                        ║
╠════════════════════════════════════════════════════════════════╣
║ You have enabled --go-off                                      ║
║                                                                ║
║ This will:                                                     ║
║ • Automatically dismiss ALL file edit prompts                  ║
║ • Automatically dismiss ALL file creation prompts              ║
║ • Automatically dismiss ALL bash command prompts               ║
║                                                                ║
║ Claude will have FULL CONTROL to modify files and run commands ║
║ without ANY confirmation!                                      ║
║                                                                ║
║    This is EXTREMELY DANGEROUS and should only be used when    ║
║    you fully trust the AI and understand the risks!            ║
╚════════════════════════════════════════════════════════════════╝

Are you ABSOLUTELY SURE you want to continue? (y/N):
```

## Command Line Options

### Basic Options
```bash
# Show help
claude-composer --help
claude-composer -h

# Show version
claude-composer --version
claude-composer -v

# Print mode (non-interactive)
claude-composer --print <file>
```

### Notification Options
```bash
# Enable notifications
claude-composer --show-notifications "Your prompt"

# Disable notifications
claude-composer --no-show-notifications "Your prompt"
```

### Safety Options
```bash
# Dismiss edit file prompts
claude-composer --dangerously-dismiss-edit-file-prompts "Prompt"

# Don't dismiss edit file prompts
claude-composer --no-dangerously-dismiss-edit-file-prompts "Prompt"

# Dismiss create file prompts
claude-composer --dangerously-dismiss-create-file-prompts "Prompt"

# Don't dismiss create file prompts  
claude-composer --no-dangerously-dismiss-create-file-prompts "Prompt"

# Dismiss bash command prompts
claude-composer --dangerously-dismiss-bash-command-prompts "Prompt"

# Don't dismiss bash command prompts
claude-composer --no-dangerously-dismiss-bash-command-prompts "Prompt"

# Allow dirty directory
claude-composer --dangerously-allow-in-dirty-directory "Prompt"

# Don't allow dirty directory
claude-composer --no-dangerously-allow-in-dirty-directory "Prompt"

# Allow without version control
claude-composer --dangerously-allow-without-version-control "Prompt"

# Don't allow without version control
claude-composer --no-dangerously-allow-without-version-control "Prompt"
```

### Toolset Options
```bash
# Use specific toolset
claude-composer --toolset <name> "Prompt"

# Ignore default toolsets from config
claude-composer --no-default-toolsets "Prompt"

# Combine with specific toolset
claude-composer --no-default-toolsets --toolset specific "Prompt"
```

### Configuration Options
```bash
# Ignore global configuration file
claude-composer --ignore-global-config "Prompt"

# Enable pattern match logging
claude-composer --log-all-pattern-matches "Prompt"
```

### YOLO Options
```bash
# Enable all dangerous settings (with confirmation)
claude-composer --go-off "Prompt"
```

## Advanced Usage

### Environment Variables

#### Custom Claude CLI Path
```bash
export CLAUDE_APP_PATH="/path/to/custom/claude"
claude-composer "Your prompt"
```

#### Custom Configuration Directory
```bash
export CLAUDE_COMPOSER_CONFIG_DIR="/path/to/config"
claude-composer "Your prompt"
```

#### Custom Patterns Path
```bash
export CLAUDE_PATTERNS_PATH="/path/to/patterns.js"
claude-composer "Your prompt"
```

### Subcommand Passthrough
Claude Composer automatically detects and passes through Claude CLI subcommands:

```bash
# These bypass Claude Composer processing
claude-composer auth login
claude-composer config show
claude-composer model list
```

### Print Mode
Non-interactive mode for scripts and automation:

```bash
# Print file contents
claude-composer --print myfile.txt

# Print with processing
claude-composer --print --toolset data-science data.csv
```

### Interactive Sessions
Claude Composer preserves full Claude CLI interactivity:
- **TTY support** - Full terminal features
- **Color preservation** - ANSI colors maintained
- **Resize handling** - Terminal resize events
- **Signal handling** - Proper Ctrl+C, etc.

### Piped Input/Output
Works with shell pipes and redirects:

```bash
# Pipe input
echo "Analyze this data" | claude-composer

# Redirect output
claude-composer "Generate code" > output.txt

# Chain with other commands
claude-composer "Process data" | grep "important"
```

### Multiple Tool Configurations
Complex toolset combinations:

```bash
# Multiple toolsets
claude-composer \
  --toolset core \
  --toolset web-dev \
  --toolset testing \
  "Build a full-stack app with tests"

# Override defaults with specific toolset
claude-composer \
  --no-default-toolsets \
  --toolset minimal \
  "Simple task"

# Combine with safety overrides
claude-composer \
  --toolset aggressive \
  --dangerously-dismiss-edit-file-prompts \
  --dangerously-allow-in-dirty-directory \
  "Rapid prototyping"
```

## Troubleshooting

### Common Issues

#### Claude CLI Not Found
```
Error: Claude CLI not found at: /path/to/claude
```
**Solution:** Install Claude CLI or set `CLAUDE_APP_PATH`:
```bash
export CLAUDE_APP_PATH="/correct/path/to/claude"
```

#### Configuration Validation Errors
```
Error: Invalid configuration in config.yaml
Validation errors:
  • show_notifications: Expected boolean, received string
```
**Solution:** Fix YAML syntax and types in configuration file.

#### Permission Errors
```
Error: Claude CLI is not executable: /path/to/claude
```
**Solution:** Fix file permissions:
```bash
chmod +x /path/to/claude
```

#### Pattern Not Matching
**Issue:** Custom patterns not triggering
**Debug steps:**
1. Enable pattern logging: `--log-all-pattern-matches`
2. Check logs: `~/.claude-composer/logs/pattern-matches-*.jsonl`
3. Verify pattern syntax and ANSI code handling

#### Toolset Not Found
```
Error: Toolset file not found: ~/.claude-composer/toolsets/missing.yaml
```
**Solution:** Create the toolset file or use existing toolset name.

#### Git Status Warnings
```
※ Running in directory with uncommitted changes
```
**Solutions:**
- Commit your changes: `git commit -am "Save changes"`
- Use safety override: `--dangerously-allow-in-dirty-directory`
- Configure in YAML: `dangerously_allow_in_dirty_directory: true`

### Debug Mode
Enable verbose logging and debugging:

```bash
# Enable pattern match logging
claude-composer --log-all-pattern-matches "Your prompt"

# Check log files
tail -f ~/.claude-composer/logs/pattern-matches-*.jsonl

# View configuration
claude-composer --help  # Shows current config location
```

### Reset Configuration
Start fresh by removing configuration:

```bash
# Backup current config
mv ~/.claude-composer ~/.claude-composer.backup

# Run Claude Composer to recreate defaults
claude-composer --version
```

### Support and Issues
- **GitHub Issues:** [Report bugs and feature requests](https://github.com/your-repo/claude-composer/issues)
- **Documentation:** [Latest docs and examples](https://github.com/your-repo/claude-composer/docs)
- **Discussions:** [Community support and questions](https://github.com/your-repo/claude-composer/discussions)

---

## Examples

### Basic Automation
```bash
# Auto-approve all file operations
claude-composer \
  --dangerously-dismiss-edit-file-prompts \
  --dangerously-dismiss-create-file-prompts \
  "Refactor my codebase"
```

### Development Workflow
```bash
# Full development setup
claude-composer \
  --toolset web-dev \
  --show-notifications \
  --dangerously-allow-in-dirty-directory \
  "Build a React component with tests"
```

### Safe Exploration
```bash
# Read-only mode for learning
claude-composer \
  --toolset safe \
  --no-dangerously-dismiss-edit-file-prompts \
  "Explain this codebase"
```

### Rapid Prototyping
```bash
# Maximum automation (dangerous!)
claude-composer \
  --go-off \
  --toolset aggressive \
  "Build a complete app quickly"
```

This comprehensive guide covers all features and usage patterns of Claude Composer. For the latest updates and community contributions, visit the project repository.