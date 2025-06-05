# Claude Composer README Outline

- **Project Title & Tagline**

  - Claude Composer CLI
  - "A tool for enhancing Claude Code"

- **Features**

  - Automatic dialog dismissal
  - System notifications for lifecycle events and dialogs
  - Toolsets: Inject tools and allow with predefined set
  - Rulesets: Fine grained control for automatic dialog dismissal
  - Internal rulesets and toolsets for quick setup
  - Project-level configuration support

- **Quick Start**

  - Installation (npm/yarn/pnpm)
  - Basic usage example
  - First-time setup with `cc-init`

- **What is Claude Composer?**

  - Brief description of purpose
  - Key benefits features

- **Installation & Setup**

  - Prerequisites
  - Installation methods
  - Initial configuration (`cc-init`)
  - Directory structure created

- **Basic Usage**

  - Command structure
  - Common workflows
  - Examples with different rulesets

- **Configuration**

  - Configuration file location
  - Basic configuration options
  - Environment variables

- **Rulesets**

  - What are rulesets
  - Internal rulesets (internal:cautious, internal:yolo)
  - Project-level rulesets (project: prefix)
  - Using rulesets
  - Creating custom rulesets

- **Toolsets**

  - What are toolsets
  - Internal toolsets (internal:core)
  - Project-level toolsets (project: prefix)
  - Using toolsets
  - Creating custom toolsets

- **Command Line Options**
  - Complete flag reference
  - Flag categories
  - Examples for common scenarios

## Supporting Documentation Structure

- **docs/configuration-guide.md**

  - Complete configuration reference
  - YAML schema details
  - Advanced configuration examples
  - Merging behavior

- **docs/rulesets-guide.md**

  - Ruleset schema
  - Pattern acceptance rules
  - Path-based configurations
  - Examples and use cases
  - Internal rulesets reference
  - Project-level rulesets

- **docs/toolsets-guide.md**

  - Toolset schema
  - MCP server configuration
  - Tool allow/deny lists
  - Integration examples
  - Internal toolsets reference
  - Project-level toolsets

- **docs/notifications-guide.md**

  - Notification types
  - Configuration options
  - Stickiness settings

- **docs/patterns-reference.md**

  - Pattern matching system
  - Available patterns
  - Custom patterns
  - Pattern development

- **docs/cli-reference.md**

  - Complete command reference
  - Subcommands (cc-init)
  - Flag combinations
  - Advanced usage
  - Integration with scripts

- **docs/development.md**
  - Architecture overview
  - Building from source
  - Testing
  - Contributing guidelines
