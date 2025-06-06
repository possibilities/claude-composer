# Examples & Workflows

Common usage patterns for Claude Composer.

## Common Workflows

### New Feature Development

```bash
claude-composer --ruleset internal:cautious
```

### Code Review

```bash
claude-composer --ruleset internal:safe
```

### Debugging

```bash
claude-composer --ruleset internal:yolo --allow-buffer-snapshots
```

## Team Collaboration

1. Create project config: `claude-composer cc-init --project`
2. Add custom rulesets in `.claude-composer/rulesets/`
3. Commit to version control
4. Team automatically uses project config

## CI/CD Integration

```bash
export CLAUDE_COMPOSER_NO_NOTIFY=1
claude-composer --quiet --dangerously-suppress-automatic-acceptance-confirmation
```

## Security Workflows

### Trust Progression

1. Start with `internal:safe` - manual confirmations
2. Progress to `internal:cautious` - project automation
3. Create custom rulesets as needed

## Development Patterns

Create role-specific rulesets:

- **Frontend**: JS/CSS files and package.json
- **Backend**: Server code and database scripts
- **Full-Stack**: Combined permissions

## Special Use Cases

- **Learning**: Use `internal:safe` for exploration
- **Refactoring**: Custom ruleset for src and test edits
- **Migration**: Use `internal:cautious` with notifications

## Best Practices

1. Start with conservative rulesets
2. Version control `.claude-composer/` configuration
3. Review logs periodically
4. Document team workflows

## See Also

- [Configuration Guide](./configuration.md)
- [Rulesets Reference](./rulesets.md)
- [CLI Reference](./cli-reference.md)
