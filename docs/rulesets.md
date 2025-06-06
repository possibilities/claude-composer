# Rulesets Reference

Rulesets control which permission dialogs are automatically accepted or rejected.

## Built-in Rulesets

See [internal-rulesets.md](./internal-rulesets.md) for:

- `internal:safe` - Manual confirmation for all
- `internal:cautious` - Balanced automation (recommended)
- `internal:yolo` - Accept all (⚠️ use with caution)

## Ruleset Structure

```yaml
name: my-ruleset
description: Custom ruleset

# Simple boolean rules
accept_project_edit_file_prompts: true

# Path-based rules
accept_project_create_file_prompts:
  paths:
    - 'src/**'
    - '!**/*.secret'

# Domain-based rules
accept_fetch_content_prompts:
  domains:
    - 'github.com'
    - '*.mydomain.com'
```

## Rule Types

### File Operations

```yaml
accept_project_create_file_prompts: true
accept_project_edit_file_prompts: true
accept_project_read_files_prompts: true
```

### Command Execution

```yaml
accept_project_bash_command_prompts:
  paths:
    - 'scripts/**'
```

### Web Requests

```yaml
accept_fetch_content_prompts:
  domains:
    - '*.github.com'
```

## Pattern Matching

### Path Patterns

- `*` - Any chars except `/`
- `**` - Any chars including `/`
- `!` - Exclude pattern

### Domain Patterns

- `github.com` - Exact match
- `*.github.com` - Subdomain wildcard
- `docs.*.com` - Pattern matching

## Using Rulesets

### Configuration

```yaml
rulesets:
  - internal:cautious
  - my-custom
```

### Command Line

```bash
claude-composer --ruleset internal:cautious
claude-composer --ruleset internal:safe --ruleset my-overrides
```

## File Locations

- **Global**: `~/.claude-composer/rulesets/*.yaml`
- **Project**: `.claude-composer/rulesets/*.yaml`

## Best Practices

1. Start with built-in rulesets
2. Use descriptive names (e.g., `frontend-dev`)
3. Test incrementally
4. Exclude sensitive files (`*.env`, `*.key`)

## Troubleshooting

- Check YAML syntax
- Use `--log-all-pattern-matches` for debugging
- Remember: later rulesets override earlier ones

## See Also

- [Configuration Guide](./configuration.md)
- [CLI Reference](./cli-reference.md)
- [Examples](./examples.md)
