# Configuration Guide

## Configuration Files

Claude Composer uses YAML files for configuration:

- **Global**: `~/.claude-composer/config.yaml`
- **Project**: `.claude-composer/config.yaml`
- **Rulesets**: `{config-dir}/rulesets/*.yaml`
- **Toolsets**: `{config-dir}/toolsets/*.yaml`

## Configuration Precedence

1. Command-line flags (highest)
2. Project configuration
3. Global configuration
4. Built-in defaults (lowest)

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

```
# Global
~/.claude-composer/
├── config.yaml
├── rulesets/*.yaml
└── toolsets/*.yaml

# Project
.claude-composer/
├── config.yaml
├── rulesets/*.yaml
└── toolsets/*.yaml
```

## Configuration Structure

```yaml
# config.yaml
rulesets:
  - internal:cautious
  - my-custom-rules

toolsets:
  - internal:core
  - my-tools

roots:
  - ~/projects
  - $WORK_DIR/repos

show_notifications: true
sticky_notifications: false
mode: plan # Optional: 'act' or 'plan'
```

## Environment Variables

Environment variables are expanded in configuration values:

```yaml
roots:
  - $HOME/projects
  - $WORK_DIR/repos
```

## See Also

- [Rulesets](./rulesets.md)
- [Toolsets](./toolsets.md)
- [CLI Reference](./cli-reference.md)
