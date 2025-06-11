# Configuration Guide

## Configuration Files

Claude Composer uses YAML files for configuration:

- **Global**: `~/.claude-composer/config.yaml`
- **Project**: `.claude-composer/config.yaml`
- **Toolsets**: `{config-dir}/toolsets/*.yaml`

## Configuration Precedence

1. Command-line flags (highest)
2. Project configuration
3. Global configuration
4. Built-in defaults (lowest)

### Path Specifications

Toolsets can be specified in several ways:

1. **By Name**: References files in predefined directories

   - `my-toolset` → `~/.claude-composer/toolsets/my-toolset.yaml`

2. **With Prefix**: Special location prefixes

   - `internal:core` → Built-in toolset
   - `project:backend` → `.claude-composer/toolsets/backend.yaml`

3. **By Path**: Absolute or relative paths
   - `/opt/shared/tools.yaml` → Absolute path
   - `~/configs/my-tools.yaml` → Home directory path
   - `./local-tools.yaml` → Relative to current directory
   - `$CONFIG_DIR/tools.yaml` → With environment variable

Example configuration using paths:

```yaml
# Mix named references with paths
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
└── toolsets/*.yaml

# Project
.claude-composer/
├── config.yaml
└── toolsets/*.yaml
```

## Configuration Structure

```yaml
# config.yaml
yolo: false # Accept all prompts automatically when true

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

- [Toolsets](./toolsets.md)
- [CLI Reference](./cli-reference.md)
