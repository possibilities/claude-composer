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
```

## Environment Variables

Environment variables are expanded in configuration values:

```yaml
roots:
  - $HOME/projects
  - $WORK_DIR/repos
```

## Best Practices

1. **Start Conservative**: Begin with `internal:cautious`
2. **Use Project Configs**: Share team settings in repo
3. **Name Purposefully**: Use descriptive ruleset/toolset names
4. **Environment Roots**: Use env vars for flexibility

## Configuration Workflows

### Global vs Project

**Global**: Personal preferences, common settings
**Project**: Team requirements, specific overrides

### Configuration Merging

- Arrays concatenate (rulesets, toolsets, roots)
- Values override (project > global)
- CLI flags override everything

## Troubleshooting

### Config Not Loading

- Check file locations
- Verify YAML syntax
- Test with `--ignore-global-config`

### Unexpected Behavior

- Check precedence order
- Verify names/paths
- Use explicit flags to debug

## See Also

- [Rulesets](./rulesets.md)
- [Toolsets](./toolsets.md)
- [CLI Reference](./cli-reference.md)
