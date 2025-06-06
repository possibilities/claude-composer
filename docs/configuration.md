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

See the [README configuration section](../readme.md#configuration) for the basic configuration structure.

### Path Specifications

Rulesets and toolsets can be specified in several ways:

1. **By Name**: References files in predefined directories

   - `my-ruleset` → `~/.claude-composer/rulesets/my-ruleset.yaml`
   - `my-toolset` → `~/.claude-composer/toolsets/my-toolset.yaml`

2. **With Prefix**: Special location prefixes

   - `internal:safe` → Built-in ruleset
   - `project:backend` → `.claude-composer/rulesets/backend.yaml`

3. **By Path**: Absolute or relative paths (NEW)
   - `/opt/shared/rules.yaml` → Absolute path
   - `~/configs/my-rules.yaml` → Home directory path
   - `./local-rules.yaml` → Relative to current directory
   - `$CONFIG_DIR/rules.yaml` → With environment variable

Example configuration using paths:

```yaml
# Mix named references with paths
rulesets:
  - internal:cautious # Built-in
  - base-rules # From ~/.claude-composer/rulesets/
  - ~/shared/team-rules.yaml # Absolute path with ~
  - ./project-rules.yaml # Relative path

toolsets:
  - internal:core
  - /opt/company/tools.yaml # Absolute path
  - $SHARED_DIR/dev.yaml # Environment variable
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

See [roots-config.md](./roots-config.md) for detailed roots configuration.

## Environment Variables

Claude Composer expands environment variables in configuration values. This is particularly useful for:

- Defining roots that vary by environment
- Sharing configurations across team members
- CI/CD integration

## Configuration Workflows

### Creating Initial Configuration

Use `cc-init` to create configuration. See [CLI Reference](./cli-reference.md#cc-init) for details.

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

Begin with `internal:cautious` and gradually relax rules as you become comfortable.

### 2. Use Project Configs for Teams

Keep project-specific configuration in the repository for consistent team behavior.

### 3. Organize Custom Rulesets

Name rulesets by their purpose (e.g., frontend-dev, backend-dev, ci-automation).

### 4. Environment-Specific Roots

Use environment variables for flexible root configuration across different environments.

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
