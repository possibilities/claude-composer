# Configuration Guide

Claude Composer uses a flexible configuration system that allows you to customize behavior at both global and project levels. This guide covers all aspects of configuration.

## Configuration Files

Claude Composer uses YAML files for configuration. The main configuration file is `config.yaml`, which can exist in multiple locations.

### File Locations

- **Global configuration**: `~/.claude-composer/config.yaml`
- **Project configuration**: `.claude-composer/config.yaml`
- **Custom rulesets**: `{config-dir}/rulesets/*.yaml`
- **Custom toolsets**: `{config-dir}/toolsets/*.yaml`

### Configuration Precedence

Configuration is loaded from multiple sources with the following precedence (highest to lowest):

1. Command-line flags
2. Project configuration (`.claude-composer/config.yaml`)
3. Global configuration (`~/.claude-composer/config.yaml`)
4. Built-in defaults

This allows you to set sensible global defaults while overriding them for specific projects or invocations.

## Configuration Structure

A complete configuration file can include:

```yaml
# Rulesets to apply (in order)
rulesets:
  - internal:cautious # Built-in ruleset
  - my-defaults # Global custom ruleset
  - project:custom-rules # Project-specific ruleset

# Toolsets to enable
toolsets:
  - internal:core # Built-in toolset
  - development-tools # Global custom toolset
  - project:my-tools # Project-specific toolset

# Trusted root directories
roots:
  - ~/projects/work
  - ~/projects/personal
  - $WORK_DIR/repos # Environment variable expansion supported

# UI preferences
show_notifications: true
sticky_notifications: false
```

## Directory Structure

### Global Configuration

```
~/.claude-composer/
├── config.yaml          # Global configuration
├── rulesets/           # Custom global rulesets (unprefixed)
│   ├── my-workflow.yaml
│   └── backend-dev.yaml
└── toolsets/           # Custom global toolsets (unprefixed)
    ├── my-tools.yaml
    └── web-dev.yaml
```

### Project Configuration

When using `claude-composer cc-init --project`:

```
your-project/
├── .claude-composer/
│   ├── config.yaml     # Project configuration
│   ├── rulesets/       # Custom project rulesets
│   └── toolsets/       # Custom project toolsets
└── ... (your project files)
```

## Roots Configuration

The `roots` configuration defines trusted parent directories where Claude Code's initial trust prompt is automatically accepted.

### How Roots Work

When you start Claude Composer in a directory whose **parent** is listed in roots:

- The "Do you trust the files in this folder?" prompt is automatically accepted
- The automatic acceptance confirmation prompt is suppressed

**Important**: Only direct children of root directories are trusted. For example, if `~/projects` is a root, then `~/projects/my-app` is trusted, but `~/projects/my-app/src` is not.

### Roots Example

```yaml
roots:
  - ~/projects # Trust direct children of ~/projects
  - /tmp/sandbox # Trust direct children of /tmp/sandbox
  - $WORK_DIR/repos # Environment variable expansion supported
```

### Path Expansion

The roots configuration supports:

- **Absolute paths**: `/home/user/projects`
- **Tilde expansion**: `~/work` expands to your home directory
- **Environment variables**: `$PROJECTS_DIR/repos` expands environment variables

## Environment Variables

Claude Composer expands environment variables in configuration values. This is particularly useful for:

- Defining roots that vary by environment
- Sharing configurations across team members
- CI/CD integration

### Example with Environment Variables

```yaml
roots:
  - $HOME/projects
  - $WORK_DIR/repos
  - ${CUSTOM_PROJECTS}/active

rulesets:
  - internal:cautious
  - $TEAM_RULESET
```

## Configuration Workflows

### Creating Initial Configuration

The easiest way to create configuration is with `cc-init`:

```bash
# Create global configuration (interactive)
claude-composer cc-init

# Create project configuration
claude-composer cc-init --project

# Skip prompts with specific options
claude-composer cc-init --use-cautious-ruleset --use-core-toolset
```

### Global vs Project Configuration

**Use global configuration when:**

- You want consistent behavior across all projects
- Setting up personal preferences
- Defining commonly used rulesets/toolsets

**Use project configuration when:**

- A project has specific requirements
- Working in a team with shared configuration
- Need to override global settings

### Configuration Merging

When both global and project configurations exist:

1. Arrays (rulesets, toolsets, roots) are concatenated
2. Boolean and string values from project config override global
3. Command-line flags override everything

## Best Practices

### 1. Start Conservative

Begin with `internal:cautious` and gradually relax rules as you become comfortable:

```yaml
rulesets:
  - internal:cautious
  - my-relaxed-rules # Override specific cautious settings
```

### 2. Use Project Configs for Teams

Keep project-specific configuration in the repository:

```bash
# In your project root
claude-composer cc-init --project
git add .claude-composer/config.yaml
git commit -m "Add Claude Composer configuration"
```

### 3. Organize Custom Rulesets

Name rulesets by their purpose:

```
~/.claude-composer/rulesets/
├── frontend-dev.yaml    # Frontend-specific rules
├── backend-dev.yaml     # Backend-specific rules
├── ci-automation.yaml   # CI/CD rules
└── personal.yaml        # Personal preferences
```

### 4. Environment-Specific Roots

Use environment variables for flexible root configuration:

```yaml
roots:
  - $HOME/personal
  - $WORK_DIR/projects
  - $TEAM_REPOS/active
```

## Troubleshooting

### Configuration Not Loading

1. Check file locations are correct
2. Verify YAML syntax with a validator
3. Use `--ignore-global-config` to test without global config
4. Check environment variables are set

### Unexpected Behavior

1. Remember precedence: CLI flags > project > global > defaults
2. Check for typos in ruleset/toolset names
3. Verify paths in roots configuration exist
4. Use `--quiet` flag to reduce output noise

### Debugging Configuration

To see which configuration is being used:

1. Check for `.claude-composer/config.yaml` in current directory
2. Check `~/.claude-composer/config.yaml` for global config
3. Use explicit `--ruleset` and `--toolset` flags to override

## See Also

- [Rulesets Reference](./rulesets.md) - Creating and using rulesets
- [Toolsets Reference](./toolsets.md) - Configuring tools and MCP servers
- [CLI Reference](./cli-reference.md) - Command-line options
- [Environment Variables](./environment-variables.md) - Available environment variables
