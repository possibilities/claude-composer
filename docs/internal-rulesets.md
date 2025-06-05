# Internal Rulesets

Claude Composer now supports internal rulesets that ship with the CLI. These are pre-configured rulesets that can be referenced using the `internal:` prefix.

## Available Internal Rulesets

### `internal:cautious` (Recommended)

Balanced approach - accepts project-level operations, requires confirmation for global operations.

See [source](../src/internal-rulesets/cautious.yaml)

### `internal:safe`

Maximum safety - requires manual confirmation for every action.

See [source](../src/internal-rulesets/safe.yaml)

### `internal:yolo`

Maximum automation - accepts all prompts without confirmation.

⚠️ **Warning**: Use with extreme caution.

See [source](../src/internal-rulesets/yolo.yaml)

## Usage

Use with `internal:` prefix:

```yaml
# In config.yaml
rulesets:
  - internal:cautious
```

```bash
# Via CLI
claude-composer --ruleset internal:cautious
```

See [CLI Reference](./cli-reference.md#cc-init) for `cc-init` options.

## Combining Rulesets

You can combine internal and custom rulesets. Later rulesets override earlier ones:

```yaml
rulesets:
  - internal:safe # Start with safe defaults
  - my-custom-overrides # Apply custom overrides
```
