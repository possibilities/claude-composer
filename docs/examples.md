# Examples & Workflows

Common usage patterns and workflows for Claude Composer.

## Getting Started

See the [README Quick Start](../readme.md#quick-start) for installation and basic usage.

## Common Workflows

### New Feature Development

```bash
# Start with balanced automation
claude-composer --ruleset internal:cautious
```

### Documentation Updates

Create a custom ruleset for documentation work that only allows editing markdown files. See [rulesets.md](./rulesets.md) for creating custom rulesets.

### Code Review Preparation

```bash
# Safe mode for careful review
claude-composer --ruleset internal:safe
```

### Debugging Session

```bash
# Full access for debugging
claude-composer --ruleset internal:yolo --allow-buffer-snapshots
```

## Team Collaboration

### Shared Project Configuration

1. Create project config: `claude-composer cc-init --project`
2. Add custom team rulesets in `.claude-composer/rulesets/`
3. Commit configuration to version control
4. Team members automatically use project config when running `claude-composer`

## CI/CD Integration

For CI environments:

```bash
export CLAUDE_COMPOSER_NO_NOTIFY=1
claude-composer --quiet --dangerously-suppress-automatic-acceptance-confirmation
```

## Security-Conscious Workflows

### Gradual Trust Building

1. Start with `internal:safe` - all manual confirmations
2. Progress to `internal:cautious` - project file automation
3. Create custom rulesets as trust builds

## Development Patterns

Create role-specific rulesets:

- **Frontend**: Allow editing JS/CSS files and package.json
- **Backend**: Allow editing server code and running database scripts
- **Full-Stack**: Combine multiple rulesets

See [rulesets.md](./rulesets.md) for examples.

## Special Use Cases

- **Learning**: Use `internal:safe` for read-only exploration
- **Refactoring**: Create custom ruleset allowing src and test edits
- **Migration**: Use `internal:cautious` with sticky notifications for progress tracking

## Advanced Patterns

### Multi-Project Management

Set global roots for all projects, then use project-specific configs for overrides.

### Custom Tool Integration

See [toolsets.md](./toolsets.md) for MCP server configuration.

### Progressive Automation

Create shell aliases for different trust levels as you become comfortable with the tool.

## Troubleshooting

1. Use `--log-all-pattern-matches` to debug ruleset patterns
2. Check logs in `~/.claude-composer/logs/`
3. Use `--ignore-global-config` to test specific configurations

## Best Practices

1. **Start Conservative**: Begin with `internal:safe` or `internal:cautious`
2. **Document Workflows**: Create team documentation for consistent usage
3. **Version Control**: Commit `.claude-composer/` configuration
4. **Regular Reviews**: Periodically review logs and update rules

## See Also

- [Configuration Guide](./configuration.md) - Configuration details
- [Rulesets Reference](./rulesets.md) - Creating rulesets
- [Toolsets Reference](./toolsets.md) - Tool configuration
- [CLI Reference](./cli-reference.md) - Command options
